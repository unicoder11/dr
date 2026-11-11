package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrNotFound     = errors.New("not found")
	ErrInvalidInput = errors.New("invalid input")
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type UserRow struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	Roles       []string  `json:"roles"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

func (s *Service) ListUsers(ctx context.Context, actorRoles []string) ([]UserRow, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.email, p.username, p.display_name, u.status, u.created_at
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		ORDER BY u.created_at DESC
		LIMIT 200
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []UserRow
	for rows.Next() {
		var r UserRow
		if err := rows.Scan(&r.ID, &r.Email, &r.Username, &r.DisplayName, &r.Status, &r.CreatedAt); err != nil {
			return nil, err
		}
		roleRows, err := s.db.Query(ctx, `SELECT role FROM user_roles WHERE user_id = $1`, r.ID)
		if err != nil {
			return nil, err
		}
		for roleRows.Next() {
			var role string
			if err := roleRows.Scan(&role); err != nil {
				roleRows.Close()
				return nil, err
			}
			r.Roles = append(r.Roles, role)
		}
		roleRows.Close()
		if r.Roles == nil {
			r.Roles = []string{}
		}
		out = append(out, r)
	}
	if out == nil {
		out = []UserRow{}
	}
	return out, rows.Err()
}

func (s *Service) GrantRole(ctx context.Context, actorID uuid.UUID, actorRoles []string, userID uuid.UUID, role string) error {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return ErrForbidden
	}
	switch role {
	case auth.RoleParticipant, auth.RoleCreator, auth.RoleOrganizer, auth.RoleArenaOperator, auth.RoleAdmin:
	default:
		return ErrInvalidInput
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO user_roles (user_id, role, granted_by)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, userID, role, actorID)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1, $2, 'grant_role', 'user', $3, jsonb_build_object('role', $4::text))
	`, uuid.New(), actorID, userID.String(), role)
	return err
}

func (s *Service) RevokeRole(ctx context.Context, actorID uuid.UUID, actorRoles []string, userID uuid.UUID, role string) error {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return ErrForbidden
	}
	switch role {
	case auth.RoleParticipant, auth.RoleCreator, auth.RoleOrganizer, auth.RoleArenaOperator, auth.RoleAdmin:
	default:
		return ErrInvalidInput
	}
	if role == auth.RoleAdmin && userID == actorID {
		return errors.New("cannot revoke own admin role")
	}
	tag, err := s.db.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1 AND role = $2`, userID, role)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1, $2, 'revoke_role', 'user', $3, jsonb_build_object('role', $4::text))
	`, uuid.New(), actorID, userID.String(), role)
	return err
}

type Flag struct {
	Key      string         `json:"key"`
	Enabled  bool           `json:"enabled"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

func (s *Service) ListFlags(ctx context.Context, actorRoles []string) ([]Flag, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	rows, err := s.db.Query(ctx, `SELECT key, enabled, COALESCE(metadata, '{}'::jsonb) FROM feature_flags ORDER BY key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Flag
	for rows.Next() {
		var f Flag
		var meta []byte
		if err := rows.Scan(&f.Key, &f.Enabled, &meta); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(meta, &f.Metadata)
		out = append(out, f)
	}
	if out == nil {
		out = []Flag{}
	}
	return out, rows.Err()
}

func (s *Service) SetFlag(ctx context.Context, actorID uuid.UUID, actorRoles []string, key string, enabled bool) (Flag, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return Flag{}, ErrForbidden
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return Flag{}, ErrInvalidInput
	}
	tag, err := s.db.Exec(ctx, `UPDATE feature_flags SET enabled = $2 WHERE key = $1`, key, enabled)
	if err != nil {
		return Flag{}, err
	}
	if tag.RowsAffected() == 0 {
		return Flag{}, ErrNotFound
	}
	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'feature_flag_set','feature_flag',$3, jsonb_build_object('enabled',$4::boolean))
	`, uuid.New(), actorID, key, enabled)

	var f Flag
	var meta []byte
	if err := s.db.QueryRow(ctx, `
		SELECT key, enabled, COALESCE(metadata, '{}'::jsonb) FROM feature_flags WHERE key = $1
	`, key).Scan(&f.Key, &f.Enabled, &meta); err != nil {
		return Flag{}, err
	}
	_ = json.Unmarshal(meta, &f.Metadata)
	return f, nil
}

type Overview struct {
	UsersTotal          int `json:"users_total"`
	ChallengesPublished int `json:"challenges_published"`
	ChallengesPending   int `json:"challenges_pending"`
	ArenasPublished     int `json:"arenas_published"`
	BookingsConfirmed   int `json:"bookings_confirmed"`
	OpenSlots           int `json:"open_slots"`
	LiveStreams         int `json:"live_streams"`
}

func (s *Service) Overview(ctx context.Context, actorRoles []string) (Overview, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return Overview{}, ErrForbidden
	}
	var o Overview
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&o.UsersTotal)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM challenges WHERE status IN ('published','in_progress')`).Scan(&o.ChallengesPublished)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM challenges WHERE status = 'pending_approval'`).Scan(&o.ChallengesPending)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM arenas WHERE is_published = true`).Scan(&o.ArenasPublished)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'`).Scan(&o.BookingsConfirmed)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM availability_slots WHERE status = 'open' AND starts_at > now()`).Scan(&o.OpenSlots)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM live_streams`).Scan(&o.LiveStreams)
	return o, nil
}

type ChallengeModRow struct {
	ID              uuid.UUID `json:"id"`
	Slug            string    `json:"slug"`
	Title           string    `json:"title"`
	Status          string    `json:"status"`
	ModalityName    string    `json:"modality_name"`
	ArenaName       string    `json:"arena_name"`
	CreatorUsername string    `json:"creator_username"`
	CreatedBy       uuid.UUID `json:"created_by"`
	StartsAt        time.Time `json:"starts_at"`
	CreatedAt       time.Time `json:"created_at"`
}

func (s *Service) ListChallenges(ctx context.Context, actorRoles []string, status string) ([]ChallengeModRow, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	q := `
		SELECT c.id, c.slug, c.title, c.status, m.name, a.name, p.username, c.created_by, c.starts_at, c.created_at
		FROM challenges c
		JOIN modalities m ON m.id = c.modality_id
		JOIN arenas a ON a.id = c.arena_id
		JOIN profiles p ON p.user_id = c.created_by
	`
	args := []any{}
	if status != "" {
		args = append(args, status)
		q += ` WHERE c.status = $1`
	}
	q += ` ORDER BY c.created_at DESC LIMIT 100`
	rows, err := s.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ChallengeModRow
	for rows.Next() {
		var r ChallengeModRow
		if err := rows.Scan(&r.ID, &r.Slug, &r.Title, &r.Status, &r.ModalityName, &r.ArenaName, &r.CreatorUsername, &r.CreatedBy, &r.StartsAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	if out == nil {
		out = []ChallengeModRow{}
	}
	return out, rows.Err()
}

type AuditRow struct {
	ID         uuid.UUID       `json:"id"`
	ActorID    *uuid.UUID      `json:"actor_user_id,omitempty"`
	ActorName  string          `json:"actor_username,omitempty"`
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Payload    json.RawMessage `json:"payload"`
	CreatedAt  time.Time       `json:"created_at"`
}

type ModalityRow struct {
	ID       uuid.UUID `json:"id"`
	Slug     string    `json:"slug"`
	Name     string    `json:"name"`
	IsActive bool      `json:"is_active"`
}

func (s *Service) ListModalities(ctx context.Context, actorRoles []string) ([]ModalityRow, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	rows, err := s.db.Query(ctx, `SELECT id, slug, name, is_active FROM modalities ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ModalityRow
	for rows.Next() {
		var m ModalityRow
		if err := rows.Scan(&m.ID, &m.Slug, &m.Name, &m.IsActive); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	if out == nil {
		out = []ModalityRow{}
	}
	return out, rows.Err()
}

func (s *Service) SetModalityActive(ctx context.Context, actorID uuid.UUID, actorRoles []string, idOrSlug string, active bool) (ModalityRow, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return ModalityRow{}, ErrForbidden
	}
	tag, err := s.db.Exec(ctx, `
		UPDATE modalities SET is_active = $2
		WHERE id::text = $1 OR slug = $1
	`, idOrSlug, active)
	if err != nil {
		return ModalityRow{}, err
	}
	if tag.RowsAffected() == 0 {
		return ModalityRow{}, ErrNotFound
	}
	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'modality_set_active','modality',$3, jsonb_build_object('active',$4::boolean))
	`, uuid.New(), actorID, idOrSlug, active)

	var m ModalityRow
	if err := s.db.QueryRow(ctx, `
		SELECT id, slug, name, is_active FROM modalities
		WHERE id::text = $1 OR slug = $1
		LIMIT 1
	`, idOrSlug).Scan(&m.ID, &m.Slug, &m.Name, &m.IsActive); err != nil {
		return ModalityRow{}, err
	}
	return m, nil
}

func (s *Service) ListAudit(ctx context.Context, actorRoles []string) ([]AuditRow, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	rows, err := s.db.Query(ctx, `
		SELECT a.id, a.actor_user_id, COALESCE(p.username, ''), a.action, a.entity_type, a.entity_id,
		       COALESCE(a.payload, '{}'::jsonb), a.created_at
		FROM audit_logs a
		LEFT JOIN profiles p ON p.user_id = a.actor_user_id
		ORDER BY a.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AuditRow
	for rows.Next() {
		var r AuditRow
		if err := rows.Scan(&r.ID, &r.ActorID, &r.ActorName, &r.Action, &r.EntityType, &r.EntityID, &r.Payload, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	if out == nil {
		out = []AuditRow{}
	}
	return out, rows.Err()
}
