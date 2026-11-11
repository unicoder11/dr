package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const (
	SettingPotFeeBPS = "pot_platform_fee_bps"
	DefaultPotFeeBPS = 1000 // 10%
	MaxPotFeeBPS     = 5000 // 50% hard cap
)

type Setting struct {
	Key       string    `json:"key"`
	ValueInt  *int      `json:"value_int,omitempty"`
	ValueText *string   `json:"value_text,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Settlement struct {
	ID                uuid.UUID  `json:"id"`
	ChallengeID       uuid.UUID  `json:"challenge_id"`
	ChallengeSlug     string     `json:"challenge_slug"`
	ChallengeTitle    string     `json:"challenge_title"`
	WinnerUserID      uuid.UUID  `json:"winner_user_id"`
	WinnerUsername    string     `json:"winner_username"`
	PotCents          int        `json:"pot_cents"`
	PlatformFeeBPS    int        `json:"platform_fee_bps"`
	PlatformFeeCents  int        `json:"platform_fee_cents"`
	WinnerPayoutCents int        `json:"winner_payout_cents"`
	Status            string     `json:"status"`
	ReleasedBy        *uuid.UUID `json:"released_by,omitempty"`
	Notes             string     `json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}

type PotPreview struct {
	ChallengeID       uuid.UUID  `json:"challenge_id"`
	Slug              string     `json:"slug"`
	Title             string     `json:"title"`
	Status            string     `json:"status"`
	StakeCents        int        `json:"stake_cents"`
	CreatorPaidCents  int        `json:"creator_paid_cents"`
	EntriesPaidCents  int        `json:"entries_paid_cents"`
	PotCents          int        `json:"pot_cents"`
	PlatformFeeBPS    int        `json:"platform_fee_bps"`
	PlatformFeeCents  int        `json:"platform_fee_cents"`
	WinnerPayoutCents int        `json:"winner_payout_cents"`
	AlreadySettled    bool       `json:"already_settled"`
	SettlementID      *uuid.UUID `json:"settlement_id,omitempty"`
}

func (s *Service) GetSettingInt(ctx context.Context, key string, fallback int) (int, error) {
	var v *int
	err := s.db.QueryRow(ctx, `
		SELECT value_int FROM platform_settings WHERE key = $1
	`, key).Scan(&v)
	if err != nil {
		if errorsIsNoRows(err) {
			return fallback, nil
		}
		return fallback, err
	}
	if v == nil {
		return fallback, nil
	}
	return *v, nil
}

func (s *Service) ListSettings(ctx context.Context, actorRoles []string) ([]Setting, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	rows, err := s.db.Query(ctx, `
		SELECT key, value_int, value_text, updated_at
		FROM platform_settings
		ORDER BY key
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Setting
	for rows.Next() {
		var st Setting
		if err := rows.Scan(&st.Key, &st.ValueInt, &st.ValueText, &st.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	if out == nil {
		out = []Setting{}
	}
	return out, rows.Err()
}

func (s *Service) SetSettingInt(ctx context.Context, actorID uuid.UUID, actorRoles []string, key string, value int) (Setting, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return Setting{}, ErrForbidden
	}
	key = strings.TrimSpace(key)
	switch key {
	case SettingPotFeeBPS:
		if value < 0 || value > MaxPotFeeBPS {
			return Setting{}, fmt.Errorf("%w: fee bps must be 0..%d", ErrInvalidInput, MaxPotFeeBPS)
		}
	default:
		return Setting{}, ErrInvalidInput
	}

	_, err := s.db.Exec(ctx, `
		INSERT INTO platform_settings (key, value_int, updated_at)
		VALUES ($1, $2, now())
		ON CONFLICT (key) DO UPDATE SET value_int = EXCLUDED.value_int, updated_at = now()
	`, key, value)
	if err != nil {
		return Setting{}, err
	}
	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'platform_setting_set','platform_setting',$3, jsonb_build_object('value_int',$4::int))
	`, uuid.New(), actorID, key, value)

	var st Setting
	err = s.db.QueryRow(ctx, `
		SELECT key, value_int, value_text, updated_at FROM platform_settings WHERE key = $1
	`, key).Scan(&st.Key, &st.ValueInt, &st.ValueText, &st.UpdatedAt)
	return st, err
}

func (s *Service) PotPreview(ctx context.Context, actorRoles []string, idOrSlug string) (PotPreview, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return PotPreview{}, ErrForbidden
	}
	return s.computePot(ctx, idOrSlug)
}

func (s *Service) computePot(ctx context.Context, idOrSlug string) (PotPreview, error) {
	var p PotPreview
	err := s.db.QueryRow(ctx, `
		SELECT c.id, c.slug, c.title, c.status, c.stake_cents
		FROM challenges c
		WHERE c.id::text = $1 OR c.slug = $1
	`, idOrSlug).Scan(&p.ChallengeID, &p.Slug, &p.Title, &p.Status, &p.StakeCents)
	if err != nil {
		if errorsIsNoRows(err) {
			return PotPreview{}, ErrNotFound
		}
		return PotPreview{}, err
	}

	_ = s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents),0)::int FROM challenge_submission_payments
		WHERE challenge_id = $1 AND status = 'paid'
	`, p.ChallengeID).Scan(&p.CreatorPaidCents)
	_ = s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents),0)::int FROM challenge_entry_payments
		WHERE challenge_id = $1 AND status = 'paid'
	`, p.ChallengeID).Scan(&p.EntriesPaidCents)

	p.PotCents = p.CreatorPaidCents + p.EntriesPaidCents
	feeBPS, _ := s.GetSettingInt(ctx, SettingPotFeeBPS, DefaultPotFeeBPS)
	p.PlatformFeeBPS = feeBPS
	p.PlatformFeeCents, p.WinnerPayoutCents = splitPot(p.PotCents, feeBPS)

	var settledID uuid.UUID
	err = s.db.QueryRow(ctx, `
		SELECT id FROM challenge_settlements WHERE challenge_id = $1 AND status = 'released'
	`, p.ChallengeID).Scan(&settledID)
	if err == nil {
		p.AlreadySettled = true
		p.SettlementID = &settledID
	} else if !errorsIsNoRows(err) {
		return PotPreview{}, err
	}
	return p, nil
}

func splitPot(potCents, feeBPS int) (feeCents, winnerCents int) {
	if potCents <= 0 {
		return 0, 0
	}
	if feeBPS < 0 {
		feeBPS = 0
	}
	if feeBPS > 10000 {
		feeBPS = 10000
	}
	feeCents = (potCents * feeBPS) / 10000
	winnerCents = potCents - feeCents
	return feeCents, winnerCents
}

func (s *Service) SettleChallenge(ctx context.Context, actorID uuid.UUID, actorRoles []string, idOrSlug string, winnerUserID uuid.UUID, notes string) (Settlement, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return Settlement{}, ErrForbidden
	}
	if winnerUserID == uuid.Nil {
		return Settlement{}, ErrInvalidInput
	}

	preview, err := s.computePot(ctx, idOrSlug)
	if err != nil {
		return Settlement{}, err
	}
	if preview.AlreadySettled {
		return Settlement{}, fmt.Errorf("%w: already settled", ErrInvalidInput)
	}
	switch preview.Status {
	case "published", "in_progress", "completed":
	default:
		return Settlement{}, fmt.Errorf("%w: challenge must be published/in_progress/completed", ErrInvalidInput)
	}
	if preview.PotCents <= 0 {
		return Settlement{}, fmt.Errorf("%w: empty pot", ErrInvalidInput)
	}

	var creatorID uuid.UUID
	_ = s.db.QueryRow(ctx, `SELECT created_by FROM challenges WHERE id = $1`, preview.ChallengeID).Scan(&creatorID)

	eligible := winnerUserID == creatorID
	if !eligible {
		_ = s.db.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM challenge_participants
				WHERE challenge_id = $1 AND user_id = $2 AND status IN ('confirmed','checked_in')
			)
		`, preview.ChallengeID, winnerUserID).Scan(&eligible)
	}
	if !eligible {
		return Settlement{}, fmt.Errorf("%w: winner must be creator or confirmed participant", ErrInvalidInput)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Settlement{}, err
	}
	defer tx.Rollback(ctx)

	var exists bool
	_ = tx.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM challenge_settlements WHERE challenge_id = $1 AND status = 'released')
	`, preview.ChallengeID).Scan(&exists)
	if exists {
		return Settlement{}, fmt.Errorf("%w: already settled", ErrInvalidInput)
	}

	id := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO challenge_settlements (
			id, challenge_id, winner_user_id, pot_cents, platform_fee_bps,
			platform_fee_cents, winner_payout_cents, status, released_by, notes
		) VALUES ($1,$2,$3,$4,$5,$6,$7,'released',$8,$9)
	`, id, preview.ChallengeID, winnerUserID, preview.PotCents, preview.PlatformFeeBPS,
		preview.PlatformFeeCents, preview.WinnerPayoutCents, actorID, strings.TrimSpace(notes))
	if err != nil {
		return Settlement{}, err
	}

	if preview.Status != "completed" {
		_, err = tx.Exec(ctx, `
			UPDATE challenges SET status = 'completed', updated_at = now() WHERE id = $1
		`, preview.ChallengeID)
		if err != nil {
			return Settlement{}, err
		}
	}

	_, _ = tx.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'challenge_settle','challenge',$3,
		        jsonb_build_object(
		          'winner_user_id',$4::text,
		          'pot_cents',$5::int,
		          'platform_fee_cents',$6::int,
		          'winner_payout_cents',$7::int,
		          'platform_fee_bps',$8::int
		        ))
	`, uuid.New(), actorID, preview.ChallengeID.String(), winnerUserID.String(),
		preview.PotCents, preview.PlatformFeeCents, preview.WinnerPayoutCents, preview.PlatformFeeBPS)

	if err := tx.Commit(ctx); err != nil {
		return Settlement{}, err
	}

	return s.GetSettlement(ctx, actorRoles, id.String())
}

func (s *Service) GetSettlement(ctx context.Context, actorRoles []string, idOrChallenge string) (Settlement, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return Settlement{}, ErrForbidden
	}
	var st Settlement
	err := s.db.QueryRow(ctx, `
		SELECT s.id, s.challenge_id, c.slug, c.title, s.winner_user_id, COALESCE(p.username,''),
		       s.pot_cents, s.platform_fee_bps, s.platform_fee_cents, s.winner_payout_cents,
		       s.status, s.released_by, s.notes, s.created_at
		FROM challenge_settlements s
		JOIN challenges c ON c.id = s.challenge_id
		LEFT JOIN profiles p ON p.user_id = s.winner_user_id
		WHERE s.id::text = $1 OR s.challenge_id::text = $1 OR c.slug = $1
		ORDER BY s.created_at DESC
		LIMIT 1
	`, idOrChallenge).Scan(
		&st.ID, &st.ChallengeID, &st.ChallengeSlug, &st.ChallengeTitle, &st.WinnerUserID, &st.WinnerUsername,
		&st.PotCents, &st.PlatformFeeBPS, &st.PlatformFeeCents, &st.WinnerPayoutCents,
		&st.Status, &st.ReleasedBy, &st.Notes, &st.CreatedAt,
	)
	if err != nil {
		if errorsIsNoRows(err) {
			return Settlement{}, ErrNotFound
		}
		return Settlement{}, err
	}
	return st, nil
}

func (s *Service) ListSettlements(ctx context.Context, actorRoles []string) ([]Settlement, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	rows, err := s.db.Query(ctx, `
		SELECT s.id, s.challenge_id, c.slug, c.title, s.winner_user_id, COALESCE(p.username,''),
		       s.pot_cents, s.platform_fee_bps, s.platform_fee_cents, s.winner_payout_cents,
		       s.status, s.released_by, s.notes, s.created_at
		FROM challenge_settlements s
		JOIN challenges c ON c.id = s.challenge_id
		LEFT JOIN profiles p ON p.user_id = s.winner_user_id
		ORDER BY s.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Settlement
	for rows.Next() {
		var st Settlement
		if err := rows.Scan(
			&st.ID, &st.ChallengeID, &st.ChallengeSlug, &st.ChallengeTitle, &st.WinnerUserID, &st.WinnerUsername,
			&st.PotCents, &st.PlatformFeeBPS, &st.PlatformFeeCents, &st.WinnerPayoutCents,
			&st.Status, &st.ReleasedBy, &st.Notes, &st.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	if out == nil {
		out = []Settlement{}
	}
	return out, rows.Err()
}

func errorsIsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
