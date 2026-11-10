package challenges

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	ErrChallengeFull     = errors.New("challenge_full")
	ErrNotJoinable       = errors.New("not_joinable")
	ErrAlreadyParticipant = errors.New("already_participant")
	ErrUserNotFound      = errors.New("user_not_found")
)

const (
	PartInvited   = "invited"
	PartConfirmed = "confirmed"
	PartDeclined  = "declined"
	PartCancelled = "cancelled"
	PartCheckedIn = "checked_in"
)

type Participant struct {
	ID              uuid.UUID `json:"id"`
	ChallengeID     uuid.UUID `json:"challenge_id"`
	UserID          uuid.UUID `json:"user_id"`
	Username        string    `json:"username"`
	DisplayName     string    `json:"display_name"`
	TeamName        *string   `json:"team_name,omitempty"`
	Status          string    `json:"status"`
	InvitedBy       *uuid.UUID `json:"invited_by,omitempty"`
	ChallengeSlug   string    `json:"challenge_slug,omitempty"`
	ChallengeTitle  string    `json:"challenge_title,omitempty"`
	ChallengeStarts time.Time `json:"challenge_starts_at,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type CalendarItem struct {
	ChallengeID     uuid.UUID `json:"challenge_id"`
	Slug            string    `json:"slug"`
	Title           string    `json:"title"`
	Status          string    `json:"challenge_status"`
	ParticipantStatus string  `json:"participant_status,omitempty"`
	Role            string    `json:"role"` // owner | participant
	ModalityName    string    `json:"modality_name"`
	ArenaName       string    `json:"arena_name"`
	StartsAt        time.Time `json:"starts_at"`
	Capacity        int       `json:"capacity"`
	ConfirmedCount  int       `json:"confirmed_count"`
}

func (s *Service) ListParticipants(ctx context.Context, idOrSlug string, viewer IdentityActor) ([]Participant, error) {
	ch, err := s.Get(ctx, idOrSlug, viewer)
	if err != nil {
		return nil, err
	}
	rows, err := s.db.Query(ctx, `
		SELECT cp.id, cp.challenge_id, cp.user_id, p.username, p.display_name, cp.team_name,
		       cp.status, cp.invited_by, cp.created_at
		FROM challenge_participants cp
		JOIN profiles p ON p.user_id = cp.user_id
		WHERE cp.challenge_id = $1
		ORDER BY cp.created_at ASC
	`, ch.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Participant
	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.ID, &p.ChallengeID, &p.UserID, &p.Username, &p.DisplayName,
			&p.TeamName, &p.Status, &p.InvitedBy, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []Participant{}
	}
	return out, rows.Err()
}

func (s *Service) Join(ctx context.Context, actor IdentityActor, idOrSlug string) (Participant, error) {
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return Participant{}, err
	}
	if ch.Status != StatusPublished {
		return Participant{}, ErrNotJoinable
	}
	if ch.ConfirmedCount >= ch.Capacity {
		return Participant{}, ErrChallengeFull
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Participant{}, err
	}
	defer tx.Rollback(ctx)

	var existingID uuid.UUID
	var existingStatus string
	err = tx.QueryRow(ctx, `
		SELECT id, status FROM challenge_participants
		WHERE challenge_id = $1 AND user_id = $2
	`, ch.ID, actor.ID).Scan(&existingID, &existingStatus)
	if err == nil {
		switch existingStatus {
		case PartConfirmed, PartCheckedIn, PartInvited:
			return Participant{}, ErrAlreadyParticipant
		case PartDeclined, PartCancelled:
			_, err = tx.Exec(ctx, `
				UPDATE challenge_participants
				SET status = $2, updated_at = now(), invited_by = NULL
				WHERE id = $1
			`, existingID, PartConfirmed)
			if err != nil {
				return Participant{}, err
			}
			if err := s.lockAndCheckCapacity(ctx, tx, ch.ID, ch.Capacity); err != nil {
				return Participant{}, err
			}
			if err := tx.Commit(ctx); err != nil {
				return Participant{}, err
			}
			_ = s.notify(ctx, ch.CreatedBy, "challenge_joined", map[string]any{
				"challenge_id": ch.ID.String(),
				"slug":         ch.Slug,
				"title":        ch.Title,
				"user_id":      actor.ID.String(),
			})
			return s.getParticipant(ctx, existingID)
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return Participant{}, err
	}

	if err := s.lockAndCheckCapacity(ctx, tx, ch.ID, ch.Capacity); err != nil {
		return Participant{}, err
	}

	id := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO challenge_participants (id, challenge_id, user_id, status)
		VALUES ($1, $2, $3, $4)
	`, id, ch.ID, actor.ID, PartConfirmed)
	if err != nil {
		if strings.Contains(err.Error(), "challenge_participants_challenge_id_user_id_key") {
			return Participant{}, ErrAlreadyParticipant
		}
		return Participant{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Participant{}, err
	}
	_ = s.notify(ctx, ch.CreatedBy, "challenge_joined", map[string]any{
		"challenge_id": ch.ID.String(),
		"slug":         ch.Slug,
		"title":        ch.Title,
		"user_id":      actor.ID.String(),
	})
	return s.getParticipant(ctx, id)
}

func (s *Service) Invite(ctx context.Context, actor IdentityActor, idOrSlug, username string) (Participant, error) {
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return Participant{}, err
	}
	if !canEdit(actor, ch) {
		return Participant{}, ErrForbidden
	}
	if ch.Status != StatusPublished && ch.Status != StatusDraft && ch.Status != StatusPendingApproval {
		return Participant{}, ErrNotJoinable
	}
	username = strings.ToLower(strings.TrimSpace(username))
	var inviteeID uuid.UUID
	err = s.db.QueryRow(ctx, `SELECT user_id FROM profiles WHERE username = $1`, username).Scan(&inviteeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Participant{}, ErrUserNotFound
		}
		return Participant{}, err
	}
	if inviteeID == actor.ID {
		return Participant{}, fmt.Errorf("%w: cannot invite self", ErrInvalidInput)
	}

	var existingID uuid.UUID
	var existingStatus string
	err = s.db.QueryRow(ctx, `
		SELECT id, status FROM challenge_participants
		WHERE challenge_id = $1 AND user_id = $2
	`, ch.ID, inviteeID).Scan(&existingID, &existingStatus)
	if err == nil {
		if existingStatus == PartConfirmed || existingStatus == PartCheckedIn || existingStatus == PartInvited {
			return Participant{}, ErrAlreadyParticipant
		}
		_, err = s.db.Exec(ctx, `
			UPDATE challenge_participants
			SET status = $2, invited_by = $3, updated_at = now()
			WHERE id = $1
		`, existingID, PartInvited, actor.ID)
		if err != nil {
			return Participant{}, err
		}
		_ = s.notify(ctx, inviteeID, "challenge_invite", map[string]any{
			"challenge_id": ch.ID.String(),
			"slug":         ch.Slug,
			"title":        ch.Title,
			"from":         actor.ID.String(),
		})
		return s.getParticipant(ctx, existingID)
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return Participant{}, err
	}

	id := uuid.New()
	_, err = s.db.Exec(ctx, `
		INSERT INTO challenge_participants (id, challenge_id, user_id, status, invited_by)
		VALUES ($1, $2, $3, $4, $5)
	`, id, ch.ID, inviteeID, PartInvited, actor.ID)
	if err != nil {
		return Participant{}, err
	}
	_ = s.notify(ctx, inviteeID, "challenge_invite", map[string]any{
		"challenge_id": ch.ID.String(),
		"slug":         ch.Slug,
		"title":        ch.Title,
		"from":         actor.ID.String(),
	})
	return s.getParticipant(ctx, id)
}

func (s *Service) AcceptInvite(ctx context.Context, actor IdentityActor, participantID uuid.UUID) (Participant, error) {
	p, ch, err := s.participantWithChallenge(ctx, participantID)
	if err != nil {
		return Participant{}, err
	}
	if p.UserID != actor.ID {
		return Participant{}, ErrForbidden
	}
	if p.Status != PartInvited {
		return Participant{}, fmt.Errorf("%w: not invited", ErrInvalidInput)
	}
	if ch.Status != StatusPublished {
		return Participant{}, ErrNotJoinable
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Participant{}, err
	}
	defer tx.Rollback(ctx)

	if err := s.lockAndCheckCapacity(ctx, tx, ch.ID, ch.Capacity); err != nil {
		return Participant{}, err
	}
	_, err = tx.Exec(ctx, `
		UPDATE challenge_participants SET status = $2, updated_at = now() WHERE id = $1
	`, participantID, PartConfirmed)
	if err != nil {
		return Participant{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Participant{}, err
	}
	_ = s.notify(ctx, ch.CreatedBy, "invite_accepted", map[string]any{
		"challenge_id": ch.ID.String(),
		"slug":         ch.Slug,
		"title":        ch.Title,
		"user_id":      actor.ID.String(),
	})
	return s.getParticipant(ctx, participantID)
}

func (s *Service) DeclineInvite(ctx context.Context, actor IdentityActor, participantID uuid.UUID) (Participant, error) {
	p, ch, err := s.participantWithChallenge(ctx, participantID)
	if err != nil {
		return Participant{}, err
	}
	if p.UserID != actor.ID && !auth.HasAnyRole(actor.Roles, auth.RoleAdmin) {
		return Participant{}, ErrForbidden
	}
	if p.Status != PartInvited && p.Status != PartConfirmed {
		return Participant{}, fmt.Errorf("%w: cannot decline", ErrInvalidInput)
	}
	status := PartDeclined
	if p.Status == PartConfirmed {
		status = PartCancelled
	}
	_, err = s.db.Exec(ctx, `
		UPDATE challenge_participants SET status = $2, updated_at = now() WHERE id = $1
	`, participantID, status)
	if err != nil {
		return Participant{}, err
	}
	_ = s.notify(ctx, ch.CreatedBy, "invite_declined", map[string]any{
		"challenge_id": ch.ID.String(),
		"slug":         ch.Slug,
		"title":        ch.Title,
		"user_id":      actor.ID.String(),
		"status":       status,
	})
	return s.getParticipant(ctx, participantID)
}

func (s *Service) MyInvites(ctx context.Context, actor IdentityActor) ([]Participant, error) {
	rows, err := s.db.Query(ctx, `
		SELECT cp.id, cp.challenge_id, cp.user_id, p.username, p.display_name, cp.team_name,
		       cp.status, cp.invited_by, c.slug, c.title, c.starts_at, cp.created_at
		FROM challenge_participants cp
		JOIN profiles p ON p.user_id = cp.user_id
		JOIN challenges c ON c.id = cp.challenge_id
		WHERE cp.user_id = $1 AND cp.status = $2
		ORDER BY c.starts_at ASC
	`, actor.ID, PartInvited)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Participant
	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.ID, &p.ChallengeID, &p.UserID, &p.Username, &p.DisplayName,
			&p.TeamName, &p.Status, &p.InvitedBy, &p.ChallengeSlug, &p.ChallengeTitle,
			&p.ChallengeStarts, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []Participant{}
	}
	return out, rows.Err()
}

func (s *Service) Calendar(ctx context.Context, actor IdentityActor) ([]CalendarItem, error) {
	rows, err := s.db.Query(ctx, `
		WITH mine AS (
			SELECT c.id, c.slug, c.title, c.status, c.starts_at, c.capacity,
			       m.name AS modality_name, a.name AS arena_name,
			       'owner'::text AS role, NULL::text AS participant_status
			FROM challenges c
			JOIN modalities m ON m.id = c.modality_id
			JOIN arenas a ON a.id = c.arena_id
			WHERE c.created_by = $1 AND c.status <> 'cancelled'
			UNION
			SELECT c.id, c.slug, c.title, c.status, c.starts_at, c.capacity,
			       m.name, a.name,
			       'participant'::text, cp.status
			FROM challenge_participants cp
			JOIN challenges c ON c.id = cp.challenge_id
			JOIN modalities m ON m.id = c.modality_id
			JOIN arenas a ON a.id = c.arena_id
			WHERE cp.user_id = $1
			  AND cp.status IN ('invited','confirmed','checked_in')
			  AND c.status <> 'cancelled'
		)
		SELECT id, slug, title, status, starts_at, capacity, modality_name, arena_name, role, participant_status,
		       COALESCE((
		         SELECT COUNT(*) FROM challenge_participants cp2
		         WHERE cp2.challenge_id = mine.id AND cp2.status IN ('confirmed','checked_in')
		       ), 0)
		FROM mine
		ORDER BY starts_at ASC
	`, actor.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CalendarItem
	seen := map[uuid.UUID]bool{}
	for rows.Next() {
		var item CalendarItem
		var partStatus *string
		if err := rows.Scan(&item.ChallengeID, &item.Slug, &item.Title, &item.Status, &item.StartsAt,
			&item.Capacity, &item.ModalityName, &item.ArenaName, &item.Role, &partStatus, &item.ConfirmedCount); err != nil {
			return nil, err
		}
		if partStatus != nil {
			item.ParticipantStatus = *partStatus
		}
		// prefer owner row if duplicate
		if seen[item.ChallengeID] {
			continue
		}
		seen[item.ChallengeID] = true
		out = append(out, item)
	}
	if out == nil {
		out = []CalendarItem{}
	}
	return out, rows.Err()
}

func (s *Service) lockAndCheckCapacity(ctx context.Context, tx pgx.Tx, challengeID uuid.UUID, capacity int) error {
	var cap int
	err := tx.QueryRow(ctx, `
		SELECT capacity FROM challenges WHERE id = $1 FOR UPDATE
	`, challengeID).Scan(&cap)
	if err != nil {
		return err
	}
	if capacity > 0 {
		cap = capacity
	}
	var count int
	err = tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM challenge_participants
		WHERE challenge_id = $1 AND status IN ('confirmed','checked_in')
	`, challengeID).Scan(&count)
	if err != nil {
		return err
	}
	if count >= cap {
		return ErrChallengeFull
	}
	return nil
}

func (s *Service) getParticipant(ctx context.Context, id uuid.UUID) (Participant, error) {
	var p Participant
	err := s.db.QueryRow(ctx, `
		SELECT cp.id, cp.challenge_id, cp.user_id, p.username, p.display_name, cp.team_name,
		       cp.status, cp.invited_by, c.slug, c.title, c.starts_at, cp.created_at
		FROM challenge_participants cp
		JOIN profiles p ON p.user_id = cp.user_id
		JOIN challenges c ON c.id = cp.challenge_id
		WHERE cp.id = $1
	`, id).Scan(&p.ID, &p.ChallengeID, &p.UserID, &p.Username, &p.DisplayName,
		&p.TeamName, &p.Status, &p.InvitedBy, &p.ChallengeSlug, &p.ChallengeTitle,
		&p.ChallengeStarts, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Participant{}, ErrNotFound
		}
		return Participant{}, err
	}
	return p, nil
}

func (s *Service) participantWithChallenge(ctx context.Context, participantID uuid.UUID) (Participant, Challenge, error) {
	p, err := s.getParticipant(ctx, participantID)
	if err != nil {
		return Participant{}, Challenge{}, err
	}
	ch, err := s.scanOne(ctx, `
		SELECT c.id, c.slug, c.title, c.description, c.modality_id, m.slug, m.name,
		       c.arena_id, a.slug, a.name, c.created_by, pr.username, c.competition_type,
		       c.status, c.regulation, c.capacity, c.starts_at, c.ends_at, c.is_demo,
		       c.created_at, c.updated_at,
		       COALESCE((
		         SELECT COUNT(*) FROM challenge_participants cp
		         WHERE cp.challenge_id = c.id AND cp.status IN ('confirmed','checked_in')
		       ), 0)
		FROM challenges c
		JOIN modalities m ON m.id = c.modality_id
		JOIN arenas a ON a.id = c.arena_id
		JOIN profiles pr ON pr.user_id = c.created_by
		WHERE c.id = $1
	`, p.ChallengeID)
	if err != nil {
		return Participant{}, Challenge{}, err
	}
	return p, ch, nil
}

func (s *Service) notify(ctx context.Context, userID uuid.UUID, typ string, payload map[string]any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO notifications (id, user_id, channel, type, payload)
		VALUES ($1, $2, 'in_app', $3, $4::jsonb)
	`, uuid.New(), userID, typ, raw)
	return err
}
