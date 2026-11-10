package media

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const MaxUploadBytes = 5 << 20 // 5 MiB

var (
	ErrNotFound     = errors.New("not found")
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
	ErrTooLarge     = errors.New("too large")
)

var allowedTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

type Service struct {
	db        *pgxpool.Pool
	dir       string
	publicURL string
}

func NewService(db *pgxpool.Pool, dir, publicURL string) *Service {
	return &Service{db: db, dir: dir, publicURL: strings.TrimRight(publicURL, "/")}
}

type Actor struct {
	ID    uuid.UUID
	Roles []string
}

type Asset struct {
	ID          uuid.UUID `json:"id"`
	OwnerUserID uuid.UUID `json:"owner_user_id"`
	BucketKey   string    `json:"bucket_key"`
	ContentType string    `json:"content_type"`
	Bytes       int64     `json:"bytes"`
	Purpose     string    `json:"purpose"`
	Title       string    `json:"title"`
	IsPublic    bool      `json:"is_public"`
	Status      string    `json:"status"`
	URL         string    `json:"url"`
	CreatedAt   time.Time `json:"created_at"`
}

type LiveStream struct {
	ID           uuid.UUID  `json:"id"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	ArenaID      *uuid.UUID `json:"arena_id,omitempty"`
	ArenaSlug    string     `json:"arena_slug,omitempty"`
	ArenaName    string     `json:"arena_name,omitempty"`
	ChallengeID  *uuid.UUID `json:"challenge_id,omitempty"`
	CoverAssetID *uuid.UUID `json:"cover_asset_id,omitempty"`
	CoverURL     string     `json:"cover_url,omitempty"`
	StreamURL    string     `json:"stream_url"`
	Status       string     `json:"status"`
	StartsAt     *time.Time `json:"starts_at,omitempty"`
	IsDemo       bool       `json:"is_demo"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (s *Service) EnsureDir() error {
	return os.MkdirAll(s.dir, 0o755)
}

func (s *Service) Upload(ctx context.Context, actor Actor, r io.Reader, contentType, purpose, title string, size int64) (Asset, error) {
	if actor.ID == uuid.Nil {
		return Asset{}, ErrForbidden
	}
	if size > MaxUploadBytes {
		return Asset{}, ErrTooLarge
	}
	contentType = normalizeContentType(contentType)
	ext, ok := allowedTypes[contentType]
	if !ok {
		return Asset{}, fmt.Errorf("%w: content_type", ErrInvalidInput)
	}
	purpose = strings.TrimSpace(purpose)
	if purpose == "" {
		purpose = "cover"
	}
	switch purpose {
	case "cover", "avatar", "live", "gallery", "other":
	default:
		return Asset{}, fmt.Errorf("%w: purpose", ErrInvalidInput)
	}

	id := uuid.New()
	key := filepath.ToSlash(filepath.Join(id.String()[:2], id.String()+ext))
	abs := filepath.Join(s.dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return Asset{}, err
	}
	f, err := os.Create(abs)
	if err != nil {
		return Asset{}, err
	}
	defer f.Close()

	limited := io.LimitReader(r, MaxUploadBytes+1)
	n, err := io.Copy(f, limited)
	if err != nil {
		_ = os.Remove(abs)
		return Asset{}, err
	}
	if n > MaxUploadBytes {
		_ = os.Remove(abs)
		return Asset{}, ErrTooLarge
	}
	if n == 0 {
		_ = os.Remove(abs)
		return Asset{}, fmt.Errorf("%w: empty", ErrInvalidInput)
	}

	_, err = s.db.Exec(ctx, `
		INSERT INTO media_assets (id, owner_user_id, bucket_key, content_type, bytes, purpose, title, is_public, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,true,'ready')
	`, id, actor.ID, key, contentType, n, purpose, strings.TrimSpace(title))
	if err != nil {
		_ = os.Remove(abs)
		return Asset{}, err
	}
	return s.Get(ctx, id, actor)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID, viewer Actor) (Asset, error) {
	var a Asset
	var owner uuid.UUID
	err := s.db.QueryRow(ctx, `
		SELECT id, COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
		       bucket_key, content_type, bytes, purpose, title, is_public, status, created_at
		FROM media_assets WHERE id = $1 AND status <> 'deleted'
	`, id).Scan(&a.ID, &owner, &a.BucketKey, &a.ContentType, &a.Bytes, &a.Purpose, &a.Title, &a.IsPublic, &a.Status, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	a.OwnerUserID = owner
	if !a.IsPublic && a.OwnerUserID != viewer.ID && !auth.HasAnyRole(viewer.Roles, auth.RoleAdmin) {
		return Asset{}, ErrForbidden
	}
	a.URL = s.publicURL + "/media/" + a.ID.String()
	return a, nil
}

func (s *Service) OpenFile(ctx context.Context, id uuid.UUID) (Asset, *os.File, error) {
	a, err := s.Get(ctx, id, Actor{})
	if err != nil {
		// public read path: allow public assets without viewer
		if errors.Is(err, ErrForbidden) {
			return Asset{}, nil, ErrForbidden
		}
		return Asset{}, nil, err
	}
	if !a.IsPublic {
		return Asset{}, nil, ErrForbidden
	}
	abs := filepath.Join(s.dir, filepath.FromSlash(a.BucketKey))
	f, err := os.Open(abs)
	if err != nil {
		if os.IsNotExist(err) {
			return Asset{}, nil, ErrNotFound
		}
		return Asset{}, nil, err
	}
	return a, f, nil
}

func (s *Service) ListLive(ctx context.Context) ([]LiveStream, error) {
	rows, err := s.db.Query(ctx, `
		SELECT ls.id, ls.title, ls.description, ls.arena_id, COALESCE(a.slug,''), COALESCE(a.name,''),
		       ls.challenge_id, ls.cover_asset_id, ls.stream_url, ls.status, ls.starts_at, ls.is_demo, ls.created_at
		FROM live_streams ls
		LEFT JOIN arenas a ON a.id = ls.arena_id
		ORDER BY
		  CASE ls.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
		  ls.starts_at NULLS LAST,
		  ls.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []LiveStream
	for rows.Next() {
		var ls LiveStream
		if err := rows.Scan(
			&ls.ID, &ls.Title, &ls.Description, &ls.ArenaID, &ls.ArenaSlug, &ls.ArenaName,
			&ls.ChallengeID, &ls.CoverAssetID, &ls.StreamURL, &ls.Status, &ls.StartsAt, &ls.IsDemo, &ls.CreatedAt,
		); err != nil {
			return nil, err
		}
		if ls.CoverAssetID != nil {
			ls.CoverURL = s.publicURL + "/media/" + ls.CoverAssetID.String()
		}
		out = append(out, ls)
	}
	if out == nil {
		out = []LiveStream{}
	}
	return out, rows.Err()
}

func DetectContentType(header string, sample []byte) string {
	ct := normalizeContentType(header)
	if _, ok := allowedTypes[ct]; ok {
		return ct
	}
	if len(sample) > 0 {
		detected := http.DetectContentType(sample)
		return normalizeContentType(detected)
	}
	return ct
}

func normalizeContentType(ct string) string {
	ct = strings.TrimSpace(strings.ToLower(ct))
	if ct == "" {
		return ""
	}
	mediaType, _, err := mime.ParseMediaType(ct)
	if err != nil {
		return ct
	}
	return mediaType
}
