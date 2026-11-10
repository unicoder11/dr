package notifications

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type Notification struct {
	ID        uuid.UUID       `json:"id"`
	Type      string          `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	ReadAt    *time.Time      `json:"read_at,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

func (s *Service) List(ctx context.Context, userID uuid.UUID, unreadOnly bool) ([]Notification, error) {
	q := `
		SELECT id, type, payload, read_at, created_at
		FROM notifications
		WHERE user_id = $1
	`
	if unreadOnly {
		q += ` AND read_at IS NULL`
	}
	q += ` ORDER BY created_at DESC LIMIT 50`
	rows, err := s.db.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Type, &n.Payload, &n.ReadAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	if out == nil {
		out = []Notification{}
	}
	return out, rows.Err()
}

func (s *Service) MarkRead(ctx context.Context, userID, id uuid.UUID) error {
	_, err := s.db.Exec(ctx, `
		UPDATE notifications SET read_at = now()
		WHERE id = $1 AND user_id = $2 AND read_at IS NULL
	`, id, userID)
	return err
}
