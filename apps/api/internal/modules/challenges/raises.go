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

type StakeRaise struct {
	ID             uuid.UUID  `json:"id"`
	ChallengeID    uuid.UUID  `json:"challenge_id"`
	ProposedBy     uuid.UUID  `json:"proposed_by"`
	ProposerName   string     `json:"proposer_username,omitempty"`
	FromStakeCents int        `json:"from_stake_cents"`
	ToStakeCents   int        `json:"to_stake_cents"`
	Status         string     `json:"status"`
	ResolvedBy     *uuid.UUID `json:"resolved_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	ResolvedAt     *time.Time `json:"resolved_at,omitempty"`
}

func (s *Service) getPendingRaise(ctx context.Context, challengeID uuid.UUID) (*StakeRaise, error) {
	var r StakeRaise
	err := s.db.QueryRow(ctx, `
		SELECT r.id, r.challenge_id, r.proposed_by, COALESCE(p.username,''),
		       r.from_stake_cents, r.to_stake_cents, r.status, r.resolved_by,
		       r.created_at, r.resolved_at
		FROM challenge_stake_raises r
		LEFT JOIN profiles p ON p.user_id = r.proposed_by
		WHERE r.challenge_id = $1 AND r.status = 'pending'
		LIMIT 1
	`, challengeID).Scan(
		&r.ID, &r.ChallengeID, &r.ProposedBy, &r.ProposerName,
		&r.FromStakeCents, &r.ToStakeCents, &r.Status, &r.ResolvedBy,
		&r.CreatedAt, &r.ResolvedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *Service) ProposeRaise(ctx context.Context, actor IdentityActor, idOrSlug string, toStakeCents int) (StakeRaise, error) {
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return StakeRaise{}, err
	}
	if !ch.RaisesAllowed {
		return StakeRaise{}, ErrRaiseNotAllowed
	}
	if ch.Status != StatusPublished {
		return StakeRaise{}, ErrNotJoinable
	}
	if actor.ID == uuid.Nil || actor.ID == ch.CreatedBy {
		return StakeRaise{}, ErrForbidden
	}
	if toStakeCents <= ch.StakeCents {
		return StakeRaise{}, fmt.Errorf("%w: raise must be above current stake", ErrInvalidInput)
	}
	if _, err := normalizeStake(toStakeCents); err != nil {
		return StakeRaise{}, err
	}
	if ch.PendingRaise != nil {
		return StakeRaise{}, ErrRaisePending
	}

	var confirmed bool
	_ = s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM challenge_participants
			WHERE challenge_id = $1 AND user_id = $2 AND status IN ('confirmed','checked_in')
		)
	`, ch.ID, actor.ID).Scan(&confirmed)
	if confirmed {
		return StakeRaise{}, fmt.Errorf("%w: already confirmed; raise before joining", ErrInvalidInput)
	}

	id := uuid.New()
	_, err = s.db.Exec(ctx, `
		INSERT INTO challenge_stake_raises (
			id, challenge_id, proposed_by, from_stake_cents, to_stake_cents, status
		) VALUES ($1,$2,$3,$4,$5,'pending')
	`, id, ch.ID, actor.ID, ch.StakeCents, toStakeCents)
	if err != nil {
		if stringsContainsUnique(err) {
			return StakeRaise{}, ErrRaisePending
		}
		return StakeRaise{}, err
	}

	_ = s.notify(ctx, ch.CreatedBy, "stake_raise_proposed", map[string]any{
		"challenge_id":     ch.ID.String(),
		"slug":             ch.Slug,
		"title":            ch.Title,
		"raise_id":         id.String(),
		"from_stake_cents": ch.StakeCents,
		"to_stake_cents":   toStakeCents,
		"from":             actor.ID.String(),
	})

	raise, err := s.getRaise(ctx, id)
	if err != nil {
		return StakeRaise{}, err
	}
	return *raise, nil
}

func (s *Service) ResolveRaise(ctx context.Context, actor IdentityActor, raiseID uuid.UUID, accept bool) (StakeRaise, error) {
	raise, err := s.getRaise(ctx, raiseID)
	if err != nil {
		return StakeRaise{}, err
	}
	if raise.Status != "pending" {
		return StakeRaise{}, fmt.Errorf("%w: raise not pending", ErrInvalidInput)
	}

	ch, err := s.Get(ctx, raise.ChallengeID.String(), actor)
	if err != nil {
		return StakeRaise{}, err
	}
	if actor.ID != ch.CreatedBy && !auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleOrganizer) {
		return StakeRaise{}, ErrForbidden
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return StakeRaise{}, err
	}
	defer tx.Rollback(ctx)

	status := "refused"
	if accept {
		status = "accepted"
	}
	now := time.Now().UTC()
	tag, err := tx.Exec(ctx, `
		UPDATE challenge_stake_raises
		SET status = $2, resolved_by = $3, resolved_at = $4
		WHERE id = $1 AND status = 'pending'
	`, raiseID, status, actor.ID, now)
	if err != nil {
		return StakeRaise{}, err
	}
	if tag.RowsAffected() == 0 {
		return StakeRaise{}, fmt.Errorf("%w: raise not pending", ErrInvalidInput)
	}

	if accept {
		_, err = tx.Exec(ctx, `
			UPDATE challenges SET stake_cents = $2, updated_at = now() WHERE id = $1
		`, ch.ID, raise.ToStakeCents)
		if err != nil {
			return StakeRaise{}, err
		}
	}

	action := "stake_raise_refused"
	if accept {
		action = "stake_raise_accepted"
	}
	payload, _ := json.Marshal(map[string]any{
		"raise_id":         raiseID.String(),
		"from_stake_cents": raise.FromStakeCents,
		"to_stake_cents":   raise.ToStakeCents,
		"accepted":         accept,
	})
	_, _ = tx.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,$3,'challenge',$4,$5::jsonb)
	`, uuid.New(), actor.ID, action, ch.ID.String(), payload)

	if err := tx.Commit(ctx); err != nil {
		return StakeRaise{}, err
	}

	_ = s.notify(ctx, raise.ProposedBy, action, map[string]any{
		"challenge_id":     ch.ID.String(),
		"slug":             ch.Slug,
		"title":            ch.Title,
		"raise_id":         raiseID.String(),
		"to_stake_cents":   raise.ToStakeCents,
		"from_stake_cents": raise.FromStakeCents,
	})

	out, err := s.getRaise(ctx, raiseID)
	if err != nil {
		return StakeRaise{}, err
	}
	return *out, nil
}

// PayStakeTopUp lets the creator cover the difference after accepting a raise.
func (s *Service) PayStakeTopUp(ctx context.Context, actor IdentityActor, idOrSlug, method, last4 string) (Challenge, error) {
	if method != "pix" && method != "card" {
		return Challenge{}, ErrInvalidInput
	}
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return Challenge{}, err
	}
	if actor.ID != ch.CreatedBy && !auth.HasAnyRole(actor.Roles, auth.RoleAdmin) {
		return Challenge{}, ErrForbidden
	}
	if ch.CreatorTopUpDueCents <= 0 {
		return ch, nil
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Challenge{}, err
	}
	defer tx.Rollback(ctx)

	payload := map[string]string{"method": method, "kind": "stake_topup"}
	if last4 != "" {
		payload["last4"] = last4
	}
	raw, _ := json.Marshal(payload)
	paymentID := fmt.Sprintf("topup-%s-%s-%d", method, ch.ID.String(), time.Now().UnixNano())
	_, err = tx.Exec(ctx, `
		INSERT INTO challenge_submission_payments (
			id, challenge_id, user_id, amount_cents, currency, method, status, provider_payment_id, raw_payload
		) VALUES ($1,$2,$3,$4,'BRL',$5,'paid',$6,$7::jsonb)
	`, uuid.New(), ch.ID, actor.ID, ch.CreatorTopUpDueCents, method, paymentID, raw)
	if err != nil {
		return Challenge{}, err
	}
	_, _ = tx.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'challenge_stake_topup','challenge',$3,
		        jsonb_build_object('method',$4::text,'amount_cents',$5::int,'stake_cents',$6::int))
	`, uuid.New(), actor.ID, ch.ID.String(), method, ch.CreatorTopUpDueCents, ch.StakeCents)

	if err := tx.Commit(ctx); err != nil {
		return Challenge{}, err
	}
	return s.Get(ctx, ch.ID.String(), actor)
}

func (s *Service) ListRaises(ctx context.Context, actor IdentityActor, idOrSlug string) ([]StakeRaise, error) {
	ch, err := s.Get(ctx, idOrSlug, actor)
	if err != nil {
		return nil, err
	}
	rows, err := s.db.Query(ctx, `
		SELECT r.id, r.challenge_id, r.proposed_by, COALESCE(p.username,''),
		       r.from_stake_cents, r.to_stake_cents, r.status, r.resolved_by,
		       r.created_at, r.resolved_at
		FROM challenge_stake_raises r
		LEFT JOIN profiles p ON p.user_id = r.proposed_by
		WHERE r.challenge_id = $1
		ORDER BY r.created_at DESC
		LIMIT 50
	`, ch.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []StakeRaise
	for rows.Next() {
		var r StakeRaise
		if err := rows.Scan(
			&r.ID, &r.ChallengeID, &r.ProposedBy, &r.ProposerName,
			&r.FromStakeCents, &r.ToStakeCents, &r.Status, &r.ResolvedBy,
			&r.CreatedAt, &r.ResolvedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	if out == nil {
		out = []StakeRaise{}
	}
	return out, rows.Err()
}

func (s *Service) getRaise(ctx context.Context, id uuid.UUID) (*StakeRaise, error) {
	var r StakeRaise
	err := s.db.QueryRow(ctx, `
		SELECT r.id, r.challenge_id, r.proposed_by, COALESCE(p.username,''),
		       r.from_stake_cents, r.to_stake_cents, r.status, r.resolved_by,
		       r.created_at, r.resolved_at
		FROM challenge_stake_raises r
		LEFT JOIN profiles p ON p.user_id = r.proposed_by
		WHERE r.id = $1
	`, id).Scan(
		&r.ID, &r.ChallengeID, &r.ProposedBy, &r.ProposerName,
		&r.FromStakeCents, &r.ToStakeCents, &r.Status, &r.ResolvedBy,
		&r.CreatedAt, &r.ResolvedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func stringsContainsUnique(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "challenge_stake_raises_one_pending") || strings.Contains(msg, "unique")
}
