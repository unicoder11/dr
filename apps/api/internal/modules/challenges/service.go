package challenges

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound       = errors.New("not found")
	ErrForbidden      = errors.New("forbidden")
	ErrInvalidInput   = errors.New("invalid input")
	ErrInvalidStatus  = errors.New("invalid status transition")
	ErrModalityInactive = errors.New("modality inactive")
)

type Service struct {
	db        *pgxpool.Pool
	publicURL string
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) WithPublicURL(url string) *Service {
	s.publicURL = strings.TrimRight(url, "/")
	return s
}

type Challenge struct {
	ID              uuid.UUID  `json:"id"`
	Slug            string     `json:"slug"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	ModalityID      uuid.UUID  `json:"modality_id"`
	ModalitySlug    string     `json:"modality_slug"`
	ModalityName    string     `json:"modality_name"`
	ArenaID         uuid.UUID  `json:"arena_id"`
	ArenaSlug       string     `json:"arena_slug"`
	ArenaName       string     `json:"arena_name"`
	CreatedBy       uuid.UUID  `json:"created_by"`
	CreatorUsername string     `json:"creator_username"`
	CompetitionType string     `json:"competition_type"`
	Status          string     `json:"status"`
	Regulation      string     `json:"regulation"`
	Capacity        int        `json:"capacity"`
	ConfirmedCount  int        `json:"confirmed_count"`
	StartsAt        time.Time  `json:"starts_at"`
	EndsAt          *time.Time `json:"ends_at,omitempty"`
	CoverAssetID    *uuid.UUID `json:"cover_asset_id,omitempty"`
	CoverURL        string     `json:"cover_url,omitempty"`
	IsDemo          bool       `json:"is_demo"`
	Derived         Derived    `json:"derived"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Derived struct {
	Scheduled bool `json:"scheduled"`
	Open      bool `json:"open"`
	Full      bool `json:"full"`
}

type CreateInput struct {
	Title           string
	Description     string
	ModalityID      uuid.UUID
	ArenaID         uuid.UUID
	CompetitionType string
	Regulation      string
	Capacity        int
	StartsAt        time.Time
	EndsAt          *time.Time
}

type ListFilter struct {
	ModalitySlug string
	ArenaSlug    string
	Status       string
	OnlyPublic   bool
	CreatedBy    *uuid.UUID
	Limit        int
}

type Modality struct {
	ID       uuid.UUID `json:"id"`
	Slug     string    `json:"slug"`
	Name     string    `json:"name"`
	IsActive bool      `json:"is_active"`
}

type Arena struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	IsPublished bool      `json:"is_published"`
}

func (s *Service) ListModalities(ctx context.Context, activeOnly bool) ([]Modality, error) {
	q := `SELECT id, slug, name, is_active FROM modalities`
	if activeOnly {
		q += ` WHERE is_active = true`
	}
	q += ` ORDER BY sort_order, name`
	rows, err := s.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Modality
	for rows.Next() {
		var m Modality
		if err := rows.Scan(&m.ID, &m.Slug, &m.Name, &m.IsActive); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Service) ListArenas(ctx context.Context, publishedOnly bool) ([]Arena, error) {
	q := `SELECT id, slug, name, is_published FROM arenas`
	if publishedOnly {
		q += ` WHERE is_published = true`
	}
	q += ` ORDER BY name`
	rows, err := s.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Arena
	for rows.Next() {
		var a Arena
		if err := rows.Scan(&a.ID, &a.Slug, &a.Name, &a.IsPublished); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Service) Create(ctx context.Context, actor IdentityActor, in CreateInput) (Challenge, error) {
	if strings.TrimSpace(in.Title) == "" || in.Capacity < 1 || in.StartsAt.IsZero() {
		return Challenge{}, ErrInvalidInput
	}
	if in.CompetitionType == "" {
		in.CompetitionType = "open"
	}
	switch in.CompetitionType {
	case "one_vs_one", "team", "individual", "tournament", "open":
	default:
		return Challenge{}, fmt.Errorf("%w: competition_type", ErrInvalidInput)
	}

	var modalityActive bool
	err := s.db.QueryRow(ctx, `SELECT is_active FROM modalities WHERE id = $1`, in.ModalityID).Scan(&modalityActive)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Challenge{}, fmt.Errorf("%w: modality", ErrInvalidInput)
		}
		return Challenge{}, err
	}
	if !modalityActive {
		return Challenge{}, ErrModalityInactive
	}

	var arenaPublished bool
	err = s.db.QueryRow(ctx, `SELECT is_published FROM arenas WHERE id = $1`, in.ArenaID).Scan(&arenaPublished)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Challenge{}, fmt.Errorf("%w: arena", ErrInvalidInput)
		}
		return Challenge{}, err
	}
	if !arenaPublished {
		return Challenge{}, fmt.Errorf("%w: arena not published", ErrInvalidInput)
	}

	id := uuid.New()
	slug := uniqueSlug(in.Title, id)
	_, err = s.db.Exec(ctx, `
		INSERT INTO challenges (
			id, slug, title, description, modality_id, arena_id, created_by,
			competition_type, status, regulation, capacity, starts_at, ends_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
		)
	`, id, slug, strings.TrimSpace(in.Title), strings.TrimSpace(in.Description),
		in.ModalityID, in.ArenaID, actor.ID, in.CompetitionType, StatusDraft,
		strings.TrimSpace(in.Regulation), in.Capacity, in.StartsAt, in.EndsAt)
	if err != nil {
		return Challenge{}, err
	}
	return s.Get(ctx, id.String(), actor)
}

func (s *Service) Update(ctx context.Context, actor IdentityActor, idOrSlug string, in CreateInput) (Challenge, error) {
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return Challenge{}, err
	}
	if !canEdit(actor, ch) {
		return Challenge{}, ErrForbidden
	}
	if ch.Status != StatusDraft && ch.Status != StatusPendingApproval {
		return Challenge{}, fmt.Errorf("%w: only draft/pending editable", ErrInvalidInput)
	}
	if strings.TrimSpace(in.Title) == "" || in.Capacity < 1 {
		return Challenge{}, ErrInvalidInput
	}
	if in.CompetitionType == "" {
		in.CompetitionType = ch.CompetitionType
	}
	_, err = s.db.Exec(ctx, `
		UPDATE challenges SET
			title = $2,
			description = $3,
			modality_id = $4,
			arena_id = $5,
			competition_type = $6,
			regulation = $7,
			capacity = $8,
			starts_at = $9,
			ends_at = $10,
			updated_at = now()
		WHERE id = $1
	`, ch.ID, strings.TrimSpace(in.Title), strings.TrimSpace(in.Description),
		in.ModalityID, in.ArenaID, in.CompetitionType, strings.TrimSpace(in.Regulation),
		in.Capacity, in.StartsAt, in.EndsAt)
	if err != nil {
		return Challenge{}, err
	}
	return s.Get(ctx, ch.ID.String(), actor)
}

func (s *Service) SetCover(ctx context.Context, actor IdentityActor, idOrSlug string, assetID uuid.UUID) (Challenge, error) {
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return Challenge{}, err
	}
	if !canEdit(actor, ch) {
		return Challenge{}, ErrForbidden
	}
	var owner uuid.UUID
	var status string
	err = s.db.QueryRow(ctx, `
		SELECT COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid), status
		FROM media_assets WHERE id = $1
	`, assetID).Scan(&owner, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Challenge{}, fmt.Errorf("%w: asset", ErrInvalidInput)
		}
		return Challenge{}, err
	}
	if status != "ready" {
		return Challenge{}, fmt.Errorf("%w: asset not ready", ErrInvalidInput)
	}
	if owner != actor.ID && !auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer) {
		return Challenge{}, ErrForbidden
	}
	_, err = s.db.Exec(ctx, `
		UPDATE challenges SET cover_asset_id = $2, updated_at = now() WHERE id = $1
	`, ch.ID, assetID)
	if err != nil {
		return Challenge{}, err
	}
	return s.Get(ctx, ch.ID.String(), actor)
}

func (s *Service) Transition(ctx context.Context, actor IdentityActor, idOrSlug, to string) (Challenge, error) {
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return Challenge{}, err
	}
	if err := CanTransition(ch.Status, to); err != nil {
		return Challenge{}, fmt.Errorf("%w: %v", ErrInvalidStatus, err)
	}

	switch to {
	case StatusPendingApproval:
		if !canEdit(actor, ch) {
			return Challenge{}, ErrForbidden
		}
	case StatusPublished:
		// creator with creator/organizer/admin can publish from draft (auto-approve)
		// pending_approval requires admin/organizer
		if ch.Status == StatusPendingApproval {
			if !auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer) {
				return Challenge{}, ErrForbidden
			}
		} else if ch.Status == StatusDraft {
			if !canPublish(actor, ch) {
				return Challenge{}, ErrForbidden
			}
		} else {
			return Challenge{}, ErrForbidden
		}
	case StatusCancelled:
		if !canEdit(actor, ch) && !auth.HasRole(actor.Roles, auth.RoleAdmin) {
			return Challenge{}, ErrForbidden
		}
	case StatusInProgress, StatusCompleted, StatusDisputed:
		if !auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer, auth.RoleArenaOperator) && ch.CreatedBy != actor.ID {
			return Challenge{}, ErrForbidden
		}
	default:
		return Challenge{}, ErrForbidden
	}

	_, err = s.db.Exec(ctx, `
		UPDATE challenges SET status = $2, updated_at = now() WHERE id = $1
	`, ch.ID, to)
	if err != nil {
		return Challenge{}, err
	}
	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'challenge_transition','challenge',$3, jsonb_build_object('from',$4::text,'to',$5::text))
	`, uuid.New(), actor.ID, ch.ID.String(), ch.Status, to)

	return s.Get(ctx, ch.ID.String(), actor)
}

func (s *Service) Get(ctx context.Context, idOrSlug string, viewer IdentityActor) (Challenge, error) {
	ch, err := s.scanOne(ctx, `
		SELECT c.id, c.slug, c.title, c.description, c.modality_id, m.slug, m.name,
		       c.arena_id, a.slug, a.name, c.created_by, p.username, c.competition_type,
		       c.status, c.regulation, c.capacity, c.starts_at, c.ends_at, c.cover_asset_id, c.is_demo,
		       c.created_at, c.updated_at,
		       COALESCE((
		         SELECT COUNT(*) FROM challenge_participants cp
		         WHERE cp.challenge_id = c.id AND cp.status IN ('confirmed','checked_in')
		       ), 0)
		FROM challenges c
		JOIN modalities m ON m.id = c.modality_id
		JOIN arenas a ON a.id = c.arena_id
		JOIN profiles p ON p.user_id = c.created_by
		WHERE c.id::text = $1 OR c.slug = $1
	`, idOrSlug)
	if err != nil {
		return Challenge{}, err
	}
	if !canView(viewer, ch) {
		return Challenge{}, ErrNotFound
	}
	return ch, nil
}

func (s *Service) List(ctx context.Context, viewer IdentityActor, f ListFilter) ([]Challenge, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}
	args := []any{}
	where := []string{"1=1"}
	if f.OnlyPublic {
		where = append(where, "c.status IN ('published','in_progress','completed')")
	}
	if f.ModalitySlug != "" {
		args = append(args, f.ModalitySlug)
		where = append(where, fmt.Sprintf("m.slug = $%d", len(args)))
	}
	if f.ArenaSlug != "" {
		args = append(args, f.ArenaSlug)
		where = append(where, fmt.Sprintf("a.slug = $%d", len(args)))
	}
	if f.Status != "" {
		args = append(args, f.Status)
		where = append(where, fmt.Sprintf("c.status = $%d", len(args)))
	}
	if f.CreatedBy != nil {
		args = append(args, *f.CreatedBy)
		where = append(where, fmt.Sprintf("c.created_by = $%d", len(args)))
	}
	args = append(args, f.Limit)
	q := fmt.Sprintf(`
		SELECT c.id, c.slug, c.title, c.description, c.modality_id, m.slug, m.name,
		       c.arena_id, a.slug, a.name, c.created_by, p.username, c.competition_type,
		       c.status, c.regulation, c.capacity, c.starts_at, c.ends_at, c.cover_asset_id, c.is_demo,
		       c.created_at, c.updated_at,
		       COALESCE((
		         SELECT COUNT(*) FROM challenge_participants cp
		         WHERE cp.challenge_id = c.id AND cp.status IN ('confirmed','checked_in')
		       ), 0)
		FROM challenges c
		JOIN modalities m ON m.id = c.modality_id
		JOIN arenas a ON a.id = c.arena_id
		JOIN profiles p ON p.user_id = c.created_by
		WHERE %s
		ORDER BY c.starts_at ASC
		LIMIT $%d
	`, strings.Join(where, " AND "), len(args))

	rows, err := s.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Challenge
	for rows.Next() {
		ch, err := s.scanChallenge(rows)
		if err != nil {
			return nil, err
		}
		ch.Derived = derive(ch)
		if canView(viewer, ch) {
			out = append(out, ch)
		}
	}
	return out, rows.Err()
}

type IdentityActor struct {
	ID    uuid.UUID
	Roles []string
}

func Actor(id uuid.UUID, roles []string) IdentityActor {
	return IdentityActor{ID: id, Roles: roles}
}

func Anonymous() IdentityActor {
	return IdentityActor{}
}

func canView(actor IdentityActor, ch Challenge) bool {
	switch ch.Status {
	case StatusPublished, StatusInProgress, StatusCompleted:
		return true
	case StatusCancelled, StatusDisputed:
		return auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer) || ch.CreatedBy == actor.ID
	default:
		return auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer) || ch.CreatedBy == actor.ID
	}
}

func canEdit(actor IdentityActor, ch Challenge) bool {
	return ch.CreatedBy == actor.ID || auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer)
}

func canPublish(actor IdentityActor, ch Challenge) bool {
	if auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer) {
		return true
	}
	return ch.CreatedBy == actor.ID && auth.HasAnyRole(actor.Roles, auth.RoleCreator, auth.RoleOrganizer, auth.RoleAdmin)
}

func derive(ch Challenge) Derived {
	now := time.Now().UTC()
	d := Derived{}
	if ch.Status == StatusPublished && ch.StartsAt.After(now) {
		d.Scheduled = true
	}
	if ch.Status == StatusPublished {
		d.Full = ch.ConfirmedCount >= ch.Capacity
		d.Open = !d.Full
	}
	return d
}

type scannable interface {
	Scan(dest ...any) error
}

func (s *Service) scanOne(ctx context.Context, q string, arg any) (Challenge, error) {
	row := s.db.QueryRow(ctx, q, arg)
	ch, err := s.scanChallenge(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Challenge{}, ErrNotFound
		}
		return Challenge{}, err
	}
	ch.Derived = derive(ch)
	return ch, nil
}

func (s *Service) scanChallenge(row scannable) (Challenge, error) {
	var ch Challenge
	err := row.Scan(
		&ch.ID, &ch.Slug, &ch.Title, &ch.Description, &ch.ModalityID, &ch.ModalitySlug, &ch.ModalityName,
		&ch.ArenaID, &ch.ArenaSlug, &ch.ArenaName, &ch.CreatedBy, &ch.CreatorUsername, &ch.CompetitionType,
		&ch.Status, &ch.Regulation, &ch.Capacity, &ch.StartsAt, &ch.EndsAt, &ch.CoverAssetID, &ch.IsDemo,
		&ch.CreatedAt, &ch.UpdatedAt, &ch.ConfirmedCount,
	)
	if err != nil {
		return Challenge{}, err
	}
	if ch.CoverAssetID != nil && s.publicURL != "" {
		ch.CoverURL = s.publicURL + "/media/" + ch.CoverAssetID.String()
	}
	return ch, nil
}

var nonSlug = regexp.MustCompile(`[^a-z0-9]+`)

func uniqueSlug(title string, id uuid.UUID) string {
	s := strings.ToLower(strings.TrimSpace(title))
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == ' ' || r == '-' {
			b.WriteRune(r)
		}
	}
	s = nonSlug.ReplaceAllString(strings.ReplaceAll(b.String(), " ", "-"), "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "desafio"
	}
	if len(s) > 48 {
		s = s[:48]
	}
	return fmt.Sprintf("%s-%s", s, id.String()[:8])
}
