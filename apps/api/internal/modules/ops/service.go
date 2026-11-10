package ops

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/desafiosreais/dr/apps/api/internal/modules/challenges"
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

func (a Actor) canOps() bool {
	return auth.HasAnyRole(a.Roles, auth.RoleAdmin, auth.RoleOrganizer, auth.RoleArenaOperator)
}

type AgendaItem struct {
	Kind            string    `json:"kind"` // challenge | booking
	ID              uuid.UUID `json:"id"`
	Title           string    `json:"title"`
	StartsAt        time.Time `json:"starts_at"`
	Status          string    `json:"status"`
	Slug            string    `json:"slug,omitempty"`
	ModalityName    string    `json:"modality_name,omitempty"`
	UserDisplayName string    `json:"user_display_name,omitempty"`
	Username        string    `json:"username,omitempty"`
}

type Placement struct {
	UserID   uuid.UUID `json:"user_id"`
	Position int       `json:"position"`
}

type ResultPayload struct {
	Placements []Placement `json:"placements"`
	Notes      string      `json:"notes,omitempty"`
}

type Result struct {
	ID            uuid.UUID       `json:"id"`
	ChallengeID   uuid.UUID       `json:"challenge_id"`
	ChallengeSlug string          `json:"challenge_slug"`
	ChallengeTitle string         `json:"challenge_title"`
	Payload       ResultPayload   `json:"payload"`
	Status        string          `json:"status"`
	ValidatedBy   *uuid.UUID      `json:"validated_by,omitempty"`
	ValidatedAt   *time.Time      `json:"validated_at,omitempty"`
	RawPayload    json.RawMessage `json:"-"`
}

type RankingEntry struct {
	UserID         uuid.UUID `json:"user_id"`
	Username       string    `json:"username"`
	DisplayName    string    `json:"display_name"`
	Points         int       `json:"points"`
	Wins           int       `json:"wins"`
	Participations int       `json:"participations"`
	RankPosition   int       `json:"rank_position"`
	ModalitySlug   *string   `json:"modality_slug,omitempty"`
	Season         string    `json:"season"`
}

func (s *Service) AgendaToday(ctx context.Context, actor Actor) ([]AgendaItem, error) {
	if !actor.canOps() {
		return nil, ErrForbidden
	}
	rows, err := s.db.Query(ctx, `
		SELECT 'challenge'::text, c.id, c.title, c.starts_at, c.status, c.slug, m.name, '', ''
		FROM challenges c
		JOIN modalities m ON m.id = c.modality_id
		WHERE c.status IN ('published','in_progress')
		  AND c.starts_at::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
		UNION ALL
		SELECT 'booking'::text, b.id, COALESCE(m.name, 'Reserva'), COALESCE(s.starts_at, b.created_at), b.status, '', COALESCE(m.name,''), p.display_name, p.username
		FROM bookings b
		JOIN profiles p ON p.user_id = b.user_id
		LEFT JOIN availability_slots s ON s.id = b.slot_id
		LEFT JOIN modalities m ON m.id = s.modality_id
		WHERE b.status IN ('confirmed','checked_in')
		  AND COALESCE(s.starts_at, b.created_at)::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
		ORDER BY 4 ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AgendaItem
	for rows.Next() {
		var it AgendaItem
		if err := rows.Scan(&it.Kind, &it.ID, &it.Title, &it.StartsAt, &it.Status, &it.Slug, &it.ModalityName, &it.UserDisplayName, &it.Username); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	if out == nil {
		out = []AgendaItem{}
	}
	return out, rows.Err()
}

func (s *Service) CheckInParticipant(ctx context.Context, actor Actor, participantID uuid.UUID) error {
	if !actor.canOps() {
		return ErrForbidden
	}
	tag, err := s.db.Exec(ctx, `
		UPDATE challenge_participants
		SET status = 'checked_in', updated_at = now()
		WHERE id = $1 AND status IN ('confirmed','invited')
	`, participantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrConflict
	}
	return nil
}

func (s *Service) CheckInBooking(ctx context.Context, actor Actor, bookingID uuid.UUID) error {
	if !actor.canOps() {
		return ErrForbidden
	}
	tag, err := s.db.Exec(ctx, `
		UPDATE bookings
		SET status = 'checked_in', updated_at = now()
		WHERE id = $1 AND status = 'confirmed'
	`, bookingID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrConflict
	}
	return nil
}

func (s *Service) StartChallenge(ctx context.Context, actor Actor, idOrSlug string) error {
	if !actor.canOps() {
		return ErrForbidden
	}
	chID, status, err := s.challengeIDStatus(ctx, idOrSlug)
	if err != nil {
		return err
	}
	if err := challenges.CanTransition(status, challenges.StatusInProgress); err != nil {
		return fmt.Errorf("%w: %v", ErrConflict, err)
	}
	_, err = s.db.Exec(ctx, `UPDATE challenges SET status = $2, updated_at = now() WHERE id = $1`, chID, challenges.StatusInProgress)
	return err
}

func (s *Service) UpsertResult(ctx context.Context, actor Actor, idOrSlug string, payload ResultPayload) (Result, error) {
	if !actor.canOps() {
		return Result{}, ErrForbidden
	}
	if len(payload.Placements) == 0 {
		return Result{}, ErrInvalidInput
	}
	chID, status, err := s.challengeIDStatus(ctx, idOrSlug)
	if err != nil {
		return Result{}, err
	}
	if status != challenges.StatusInProgress && status != challenges.StatusPublished && status != challenges.StatusCompleted {
		return Result{}, ErrConflict
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return Result{}, err
	}
	var resultID uuid.UUID
	err = s.db.QueryRow(ctx, `
		INSERT INTO results (id, challenge_id, payload, status)
		VALUES ($1, $2, $3::jsonb, 'draft')
		ON CONFLICT (challenge_id) DO UPDATE
		SET payload = EXCLUDED.payload, status = 'draft', validated_by = NULL, validated_at = NULL, updated_at = now()
		RETURNING id
	`, uuid.New(), chID, raw).Scan(&resultID)
	if err != nil {
		return Result{}, err
	}
	return s.GetResult(ctx, resultID)
}

func (s *Service) ValidateResult(ctx context.Context, actor Actor, resultID uuid.UUID) (Result, error) {
	if !actor.canOps() {
		return Result{}, ErrForbidden
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Result{}, err
	}
	defer tx.Rollback(ctx)

	var (
		challengeID uuid.UUID
		raw         []byte
		status      string
	)
	err = tx.QueryRow(ctx, `
		SELECT challenge_id, payload, status FROM results WHERE id = $1 FOR UPDATE
	`, resultID).Scan(&challengeID, &raw, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Result{}, ErrNotFound
		}
		return Result{}, err
	}
	if status == "validated" {
		if err := tx.Commit(ctx); err != nil {
			return Result{}, err
		}
		return s.GetResult(ctx, resultID)
	}

	var payload ResultPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return Result{}, err
	}

	_, err = tx.Exec(ctx, `
		UPDATE results
		SET status = 'validated', validated_by = $2, validated_at = now(), updated_at = now()
		WHERE id = $1
	`, resultID, actor.ID)
	if err != nil {
		return Result{}, err
	}

	var chStatus string
	err = tx.QueryRow(ctx, `SELECT status FROM challenges WHERE id = $1 FOR UPDATE`, challengeID).Scan(&chStatus)
	if err != nil {
		return Result{}, err
	}
	if chStatus == challenges.StatusPublished || chStatus == challenges.StatusInProgress {
		if err := challenges.CanTransition(chStatus, challenges.StatusCompleted); err == nil {
			_, err = tx.Exec(ctx, `UPDATE challenges SET status = $2, updated_at = now() WHERE id = $1`, challengeID, challenges.StatusCompleted)
			if err != nil {
				return Result{}, err
			}
		}
	}

	if err := s.applyRankings(ctx, tx, challengeID, payload); err != nil {
		return Result{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Result{}, err
	}
	return s.GetResult(ctx, resultID)
}

func (s *Service) GetResultByChallenge(ctx context.Context, idOrSlug string) (Result, error) {
	var id uuid.UUID
	err := s.db.QueryRow(ctx, `
		SELECT r.id FROM results r
		JOIN challenges c ON c.id = r.challenge_id
		WHERE c.id::text = $1 OR c.slug = $1
	`, idOrSlug).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Result{}, ErrNotFound
		}
		return Result{}, err
	}
	return s.GetResult(ctx, id)
}

func (s *Service) GetResult(ctx context.Context, id uuid.UUID) (Result, error) {
	var r Result
	var raw []byte
	err := s.db.QueryRow(ctx, `
		SELECT r.id, r.challenge_id, c.slug, c.title, r.payload, r.status, r.validated_by, r.validated_at
		FROM results r
		JOIN challenges c ON c.id = r.challenge_id
		WHERE r.id = $1
	`, id).Scan(&r.ID, &r.ChallengeID, &r.ChallengeSlug, &r.ChallengeTitle, &raw, &r.Status, &r.ValidatedBy, &r.ValidatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Result{}, ErrNotFound
		}
		return Result{}, err
	}
	_ = json.Unmarshal(raw, &r.Payload)
	r.RawPayload = raw
	return r, nil
}

func (s *Service) ListRankings(ctx context.Context, modalitySlug, season string, limit int) ([]RankingEntry, error) {
	if season == "" {
		season = fmt.Sprintf("%d", time.Now().Year())
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows pgx.Rows
	var err error
	if modalitySlug == "" || modalitySlug == "geral" {
		rows, err = s.db.Query(ctx, `
			SELECT e.user_id, p.username, p.display_name, e.points, e.wins, e.participations, e.rank_position, e.season, NULL::text
			FROM ranking_entries e
			JOIN profiles p ON p.user_id = e.user_id
			WHERE e.modality_id IS NULL AND e.season = $1
			ORDER BY e.points DESC, e.wins DESC, p.username ASC
			LIMIT $2
		`, season, limit)
	} else {
		rows, err = s.db.Query(ctx, `
			SELECT e.user_id, p.username, p.display_name, e.points, e.wins, e.participations, e.rank_position, e.season, m.slug
			FROM ranking_entries e
			JOIN profiles p ON p.user_id = e.user_id
			JOIN modalities m ON m.id = e.modality_id
			WHERE m.slug = $1 AND e.season = $2
			ORDER BY e.points DESC, e.wins DESC, p.username ASC
			LIMIT $3
		`, modalitySlug, season, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RankingEntry
	for rows.Next() {
		var e RankingEntry
		var mod *string
		if err := rows.Scan(&e.UserID, &e.Username, &e.DisplayName, &e.Points, &e.Wins, &e.Participations, &e.RankPosition, &e.Season, &mod); err != nil {
			return nil, err
		}
		e.ModalitySlug = mod
		out = append(out, e)
	}
	if out == nil {
		out = []RankingEntry{}
	}
	return out, rows.Err()
}

type scoringConfig struct {
	Win           int `json:"win"`
	Podium        int `json:"podium"`
	Participation int `json:"participation"`
}

func (s *Service) applyRankings(ctx context.Context, tx pgx.Tx, challengeID uuid.UUID, payload ResultPayload) error {
	var (
		modalityID uuid.UUID
		rawCfg     []byte
		startsAt   time.Time
	)
	err := tx.QueryRow(ctx, `
		SELECT c.modality_id, m.scoring_config, c.starts_at
		FROM challenges c
		JOIN modalities m ON m.id = c.modality_id
		WHERE c.id = $1
	`, challengeID).Scan(&modalityID, &rawCfg, &startsAt)
	if err != nil {
		return err
	}
	cfg := scoringConfig{Win: 25, Podium: 10, Participation: 3}
	_ = json.Unmarshal(rawCfg, &cfg)
	season := fmt.Sprintf("%d", startsAt.Year())

	seen := map[uuid.UUID]bool{}
	for _, pl := range payload.Placements {
		if seen[pl.UserID] || pl.Position < 1 {
			continue
		}
		seen[pl.UserID] = true
		points := cfg.Participation
		wins := 0
		if pl.Position == 1 {
			points = cfg.Win
			wins = 1
		} else if pl.Position <= 3 {
			points = cfg.Podium
		}
		if err := upsertRanking(ctx, tx, &modalityID, season, pl.UserID, points, wins); err != nil {
			return err
		}
		if err := upsertRanking(ctx, tx, nil, season, pl.UserID, points, wins); err != nil {
			return err
		}
	}

	if err := recomputePositions(ctx, tx, &modalityID, season); err != nil {
		return err
	}
	return recomputePositions(ctx, tx, nil, season)
}

func upsertRanking(ctx context.Context, tx pgx.Tx, modalityID *uuid.UUID, season string, userID uuid.UUID, points, wins int) error {
	if modalityID == nil {
		_, err := tx.Exec(ctx, `
			INSERT INTO ranking_entries (id, modality_id, season, user_id, points, wins, participations, rank_position)
			VALUES ($1, NULL, $2, $3, $4, $5, 1, 0)
			ON CONFLICT (season, user_id) WHERE modality_id IS NULL DO UPDATE
			SET points = ranking_entries.points + EXCLUDED.points,
			    wins = ranking_entries.wins + EXCLUDED.wins,
			    participations = ranking_entries.participations + 1,
			    updated_at = now()
		`, uuid.New(), season, userID, points, wins)
		return err
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO ranking_entries (id, modality_id, season, user_id, points, wins, participations, rank_position)
		VALUES ($1, $2, $3, $4, $5, $6, 1, 0)
		ON CONFLICT (modality_id, season, user_id) WHERE modality_id IS NOT NULL DO UPDATE
		SET points = ranking_entries.points + EXCLUDED.points,
		    wins = ranking_entries.wins + EXCLUDED.wins,
		    participations = ranking_entries.participations + 1,
		    updated_at = now()
	`, uuid.New(), *modalityID, season, userID, points, wins)
	return err
}

func recomputePositions(ctx context.Context, tx pgx.Tx, modalityID *uuid.UUID, season string) error {
	if modalityID == nil {
		_, err := tx.Exec(ctx, `
			WITH ranked AS (
				SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, user_id) AS pos
				FROM ranking_entries
				WHERE modality_id IS NULL AND season = $1
			)
			UPDATE ranking_entries e SET rank_position = ranked.pos
			FROM ranked WHERE e.id = ranked.id
		`, season)
		return err
	}
	_, err := tx.Exec(ctx, `
		WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, user_id) AS pos
			FROM ranking_entries
			WHERE modality_id = $1 AND season = $2
		)
		UPDATE ranking_entries e SET rank_position = ranked.pos
		FROM ranked WHERE e.id = ranked.id
	`, *modalityID, season)
	return err
}

func (s *Service) challengeIDStatus(ctx context.Context, idOrSlug string) (uuid.UUID, string, error) {
	var id uuid.UUID
	var status string
	err := s.db.QueryRow(ctx, `
		SELECT id, status FROM challenges WHERE id::text = $1 OR slug = $1
	`, idOrSlug).Scan(&id, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, "", ErrNotFound
		}
		return uuid.Nil, "", err
	}
	return id, status, nil
}
