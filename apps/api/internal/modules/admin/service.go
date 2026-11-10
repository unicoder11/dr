package admin

import (
	"context"
	"errors"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrForbidden = errors.New("forbidden")

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
		out = append(out, r)
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
		return errors.New("invalid role")
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
		out = append(out, f)
	}
	return out, rows.Err()
}
