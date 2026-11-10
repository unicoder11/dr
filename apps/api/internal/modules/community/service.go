package community

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrForbidden     = errors.New("forbidden")
	ErrInvalidInput  = errors.New("invalid input")
	ErrAlreadyFollow = errors.New("already_following")
	ErrNotFollowing  = errors.New("not_following")
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type PublicProfile struct {
	UserID         uuid.UUID     `json:"user_id"`
	Username       string        `json:"username"`
	DisplayName    string        `json:"display_name"`
	Bio            string        `json:"bio"`
	City           string        `json:"city"`
	Followers      int           `json:"followers_count"`
	Following      int           `json:"following_count"`
	IsFollowing    bool          `json:"is_following"`
	Achievements   []Achievement `json:"achievements"`
	ReferralCode   string        `json:"referral_code,omitempty"`
}

type Achievement struct {
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	EarnedAt    time.Time `json:"earned_at"`
}

type FollowUser struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
}

type ReferralStats struct {
	Code       string `json:"code"`
	ShareURL   string `json:"share_url"`
	Signups    int    `json:"signups"`
}

func (s *Service) EnsureReferralCode(ctx context.Context, userID uuid.UUID) (string, error) {
	var code string
	err := s.db.QueryRow(ctx, `SELECT code FROM referral_codes WHERE user_id = $1`, userID).Scan(&code)
	if err == nil {
		return code, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	code, err = randomCode(8)
	if err != nil {
		return "", err
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)
		ON CONFLICT (user_id) DO NOTHING
	`, userID, code)
	if err != nil {
		return "", err
	}
	_ = s.db.QueryRow(ctx, `SELECT code FROM referral_codes WHERE user_id = $1`, userID).Scan(&code)
	return code, nil
}

func (s *Service) GetProfile(ctx context.Context, username string, viewerID *uuid.UUID) (PublicProfile, error) {
	username = strings.ToLower(strings.TrimSpace(username))
	var p PublicProfile
	err := s.db.QueryRow(ctx, `
		SELECT user_id, username, display_name, COALESCE(bio,''), COALESCE(city,'')
		FROM profiles WHERE username = $1
	`, username).Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Bio, &p.City)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PublicProfile{}, ErrNotFound
		}
		return PublicProfile{}, err
	}
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM follows WHERE following_id = $1`, p.UserID).Scan(&p.Followers)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM follows WHERE follower_id = $1`, p.UserID).Scan(&p.Following)
	if viewerID != nil {
		var exists bool
		_ = s.db.QueryRow(ctx, `
			SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2)
		`, *viewerID, p.UserID).Scan(&exists)
		p.IsFollowing = exists
		if *viewerID == p.UserID {
			code, _ := s.EnsureReferralCode(ctx, p.UserID)
			p.ReferralCode = code
		}
	}
	ach, err := s.ListAchievements(ctx, p.UserID)
	if err != nil {
		return PublicProfile{}, err
	}
	p.Achievements = ach
	return p, nil
}

func (s *Service) Follow(ctx context.Context, followerID uuid.UUID, followingUsername string) error {
	followingUsername = strings.ToLower(strings.TrimSpace(followingUsername))
	var followingID uuid.UUID
	err := s.db.QueryRow(ctx, `SELECT user_id FROM profiles WHERE username = $1`, followingUsername).Scan(&followingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if followingID == followerID {
		return ErrInvalidInput
	}
	tag, err := s.db.Exec(ctx, `
		INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, followerID, followingID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrAlreadyFollow
	}
	_ = s.GrantAchievement(ctx, followerID, "social")
	_ = s.GrantAchievement(ctx, followingID, "social")
	_ = s.notify(ctx, followingID, "new_follower", map[string]any{"follower_id": followerID.String()})
	return nil
}

func (s *Service) Unfollow(ctx context.Context, followerID uuid.UUID, followingUsername string) error {
	followingUsername = strings.ToLower(strings.TrimSpace(followingUsername))
	var followingID uuid.UUID
	err := s.db.QueryRow(ctx, `SELECT user_id FROM profiles WHERE username = $1`, followingUsername).Scan(&followingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	tag, err := s.db.Exec(ctx, `
		DELETE FROM follows WHERE follower_id = $1 AND following_id = $2
	`, followerID, followingID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFollowing
	}
	return nil
}

func (s *Service) ListFollowers(ctx context.Context, username string) ([]FollowUser, error) {
	return s.listFollowGraph(ctx, username, true)
}

func (s *Service) ListFollowing(ctx context.Context, username string) ([]FollowUser, error) {
	return s.listFollowGraph(ctx, username, false)
}

func (s *Service) listFollowGraph(ctx context.Context, username string, followers bool) ([]FollowUser, error) {
	username = strings.ToLower(strings.TrimSpace(username))
	var userID uuid.UUID
	err := s.db.QueryRow(ctx, `SELECT user_id FROM profiles WHERE username = $1`, username).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	q := `
		SELECT p.username, p.display_name
		FROM follows f
		JOIN profiles p ON p.user_id = f.follower_id
		WHERE f.following_id = $1
		ORDER BY f.created_at DESC
		LIMIT 100
	`
	if !followers {
		q = `
			SELECT p.username, p.display_name
			FROM follows f
			JOIN profiles p ON p.user_id = f.following_id
			WHERE f.follower_id = $1
			ORDER BY f.created_at DESC
			LIMIT 100
		`
	}
	rows, err := s.db.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []FollowUser
	for rows.Next() {
		var u FollowUser
		if err := rows.Scan(&u.Username, &u.DisplayName); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	if out == nil {
		out = []FollowUser{}
	}
	return out, rows.Err()
}

func (s *Service) ReferralStats(ctx context.Context, userID uuid.UUID, siteURL string) (ReferralStats, error) {
	code, err := s.EnsureReferralCode(ctx, userID)
	if err != nil {
		return ReferralStats{}, err
	}
	var count int
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM referral_attributions WHERE referrer_user_id = $1
	`, userID).Scan(&count)
	return ReferralStats{
		Code:     code,
		ShareURL: fmt.Sprintf("%s/cadastro?ref=%s", strings.TrimRight(siteURL, "/"), code),
		Signups:  count,
	}, nil
}

func (s *Service) AttributeReferral(ctx context.Context, referredUserID uuid.UUID, code string) error {
	code = strings.ToLower(strings.TrimSpace(code))
	if code == "" {
		return nil
	}
	var referrerID uuid.UUID
	err := s.db.QueryRow(ctx, `SELECT user_id FROM referral_codes WHERE lower(code) = $1`, code).Scan(&referrerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // ignore invalid codes silently
		}
		return err
	}
	if referrerID == referredUserID {
		return nil
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO referral_attributions (id, referrer_user_id, referred_user_id, code)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (referred_user_id) DO NOTHING
	`, uuid.New(), referrerID, referredUserID, code)
	if err != nil {
		return err
	}
	_ = s.GrantAchievement(ctx, referrerID, "recruiter")
	_ = s.notify(ctx, referrerID, "referral_signup", map[string]any{
		"referred_user_id": referredUserID.String(),
		"code":             code,
	})
	return nil
}

func (s *Service) ListAchievements(ctx context.Context, userID uuid.UUID) ([]Achievement, error) {
	rows, err := s.db.Query(ctx, `
		SELECT a.slug, a.name, a.description, a.icon, ua.earned_at
		FROM user_achievements ua
		JOIN achievements a ON a.id = ua.achievement_id
		WHERE ua.user_id = $1
		ORDER BY ua.earned_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Achievement
	for rows.Next() {
		var a Achievement
		if err := rows.Scan(&a.Slug, &a.Name, &a.Description, &a.Icon, &a.EarnedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	if out == nil {
		out = []Achievement{}
	}
	return out, rows.Err()
}

func (s *Service) GrantAchievement(ctx context.Context, userID uuid.UUID, slug string) error {
	var achID uuid.UUID
	err := s.db.QueryRow(ctx, `SELECT id FROM achievements WHERE slug = $1`, slug).Scan(&achID)
	if err != nil {
		return err
	}
	tag, err := s.db.Exec(ctx, `
		INSERT INTO user_achievements (user_id, achievement_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, userID, achID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		_ = s.notify(ctx, userID, "achievement_earned", map[string]any{"slug": slug})
	}
	return nil
}

func (s *Service) GrantFirstSteps(ctx context.Context, userID uuid.UUID) error {
	return s.GrantAchievement(ctx, userID, "first-steps")
}

func (s *Service) notify(ctx context.Context, userID uuid.UUID, typ string, payload map[string]any) error {
	raw := []byte("{}")
	if payload != nil {
		if b, err := json.Marshal(payload); err == nil {
			raw = b
		}
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO notifications (id, user_id, channel, type, payload)
		VALUES ($1, $2, 'in_app', $3, $4::jsonb)
	`, uuid.New(), userID, typ, raw)
	return err
}

func randomCode(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b)[:n], nil
}
