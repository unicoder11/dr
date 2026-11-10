package arenas

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"unicode"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound     = errors.New("not found")
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
	ErrConflict     = errors.New("conflict")
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type Actor struct {
	ID    uuid.UUID
	Roles []string
}

type Arena struct {
	ID              uuid.UUID       `json:"id"`
	Slug            string          `json:"slug"`
	Name            string          `json:"name"`
	Description     string          `json:"description"`
	Address         json.RawMessage `json:"address"`
	Timezone        string          `json:"timezone"`
	IsPublished     bool            `json:"is_published"`
	CapacityDefault int             `json:"capacity_default"`
	Modalities      []ModalityRef   `json:"modalities,omitempty"`
	OpenSlots       int             `json:"open_slots"`
	UpcomingEvents  int             `json:"upcoming_challenges"`
}

type ModalityRef struct {
	ID   uuid.UUID `json:"id"`
	Slug string    `json:"slug"`
	Name string    `json:"name"`
}

type CreateInput struct {
	Name            string
	Slug            string
	Description     string
	City            string
	State           string
	CapacityDefault int
	ModalityIDs     []uuid.UUID
	Publish         bool
}

func (s *Service) List(ctx context.Context, publishedOnly bool) ([]Arena, error) {
	q := `
		SELECT a.id, a.slug, a.name, a.description, a.address_json, a.timezone,
		       a.is_published, a.capacity_default,
		       COALESCE((
		         SELECT COUNT(*) FROM availability_slots s
		         WHERE s.arena_id = a.id AND s.status = 'open' AND s.starts_at > now()
		       ), 0),
		       COALESCE((
		         SELECT COUNT(*) FROM challenges c
		         WHERE c.arena_id = a.id AND c.status IN ('published','in_progress') AND c.starts_at > now()
		       ), 0)
		FROM arenas a
	`
	if publishedOnly {
		q += ` WHERE a.is_published = true`
	}
	q += ` ORDER BY a.name`
	rows, err := s.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Arena
	for rows.Next() {
		var a Arena
		if err := rows.Scan(&a.ID, &a.Slug, &a.Name, &a.Description, &a.Address, &a.Timezone,
			&a.IsPublished, &a.CapacityDefault, &a.OpenSlots, &a.UpcomingEvents); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	if out == nil {
		out = []Arena{}
	}
	return out, rows.Err()
}

func (s *Service) Get(ctx context.Context, slug string, allowUnpublished bool) (Arena, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	var a Arena
	err := s.db.QueryRow(ctx, `
		SELECT a.id, a.slug, a.name, a.description, a.address_json, a.timezone,
		       a.is_published, a.capacity_default,
		       COALESCE((
		         SELECT COUNT(*) FROM availability_slots s
		         WHERE s.arena_id = a.id AND s.status = 'open' AND s.starts_at > now()
		       ), 0),
		       COALESCE((
		         SELECT COUNT(*) FROM challenges c
		         WHERE c.arena_id = a.id AND c.status IN ('published','in_progress') AND c.starts_at > now()
		       ), 0)
		FROM arenas a
		WHERE a.slug = $1 OR a.id::text = $1
	`, slug).Scan(&a.ID, &a.Slug, &a.Name, &a.Description, &a.Address, &a.Timezone,
		&a.IsPublished, &a.CapacityDefault, &a.OpenSlots, &a.UpcomingEvents)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Arena{}, ErrNotFound
		}
		return Arena{}, err
	}
	if !a.IsPublished && !allowUnpublished {
		return Arena{}, ErrNotFound
	}
	rows, err := s.db.Query(ctx, `
		SELECT m.id, m.slug, m.name
		FROM arena_modalities am
		JOIN modalities m ON m.id = am.modality_id
		WHERE am.arena_id = $1
		ORDER BY m.sort_order, m.name
	`, a.ID)
	if err != nil {
		return Arena{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var m ModalityRef
		if err := rows.Scan(&m.ID, &m.Slug, &m.Name); err != nil {
			return Arena{}, err
		}
		a.Modalities = append(a.Modalities, m)
	}
	if a.Modalities == nil {
		a.Modalities = []ModalityRef{}
	}
	return a, nil
}

func (s *Service) Create(ctx context.Context, actor Actor, in CreateInput) (Arena, error) {
	if !auth.HasRole(actor.Roles, auth.RoleAdmin) {
		return Arena{}, ErrForbidden
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return Arena{}, ErrInvalidInput
	}
	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = slugify(name)
	}
	slug = strings.ToLower(slug)
	if in.CapacityDefault <= 0 {
		in.CapacityDefault = 20
	}
	addr, _ := json.Marshal(map[string]string{
		"city":    strings.TrimSpace(in.City),
		"state":   strings.TrimSpace(in.State),
		"country": "BR",
	})
	id := uuid.New()
	_, err := s.db.Exec(ctx, `
		INSERT INTO arenas (id, slug, name, description, address_json, timezone, is_published, capacity_default)
		VALUES ($1,$2,$3,$4,$5::jsonb,'America/Sao_Paulo',$6,$7)
	`, id, slug, name, strings.TrimSpace(in.Description), addr, in.Publish, in.CapacityDefault)
	if err != nil {
		if strings.Contains(err.Error(), "arenas_slug_key") {
			return Arena{}, ErrConflict
		}
		return Arena{}, err
	}
	for _, mid := range in.ModalityIDs {
		_, _ = s.db.Exec(ctx, `
			INSERT INTO arena_modalities (arena_id, modality_id) VALUES ($1,$2)
			ON CONFLICT DO NOTHING
		`, id, mid)
	}
	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'arena_create','arena',$3, jsonb_build_object('slug',$4::text))
	`, uuid.New(), actor.ID, id.String(), slug)
	return s.Get(ctx, slug, true)
}

func (s *Service) SetPublished(ctx context.Context, actor Actor, slug string, published bool) (Arena, error) {
	if !auth.HasRole(actor.Roles, auth.RoleAdmin) {
		return Arena{}, ErrForbidden
	}
	a, err := s.Get(ctx, slug, true)
	if err != nil {
		return Arena{}, err
	}
	_, err = s.db.Exec(ctx, `
		UPDATE arenas SET is_published = $2 WHERE id = $1
	`, a.ID, published)
	if err != nil {
		return Arena{}, err
	}
	return s.Get(ctx, a.Slug, true)
}

var nonSlug = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == ' ' || r == '-' {
			b.WriteRune(r)
		}
	}
	s = nonSlug.ReplaceAllString(strings.ReplaceAll(b.String(), " ", "-"), "-")
	return strings.Trim(s, "-")
}
