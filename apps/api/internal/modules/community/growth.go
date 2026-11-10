package community

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type CreatorStats struct {
	Username            string `json:"username"`
	Followers           int    `json:"followers_count"`
	Following           int    `json:"following_count"`
	ChallengesCreated   int    `json:"challenges_created"`
	ChallengesPublished int    `json:"challenges_published"`
	TotalViews          int    `json:"total_views"`
	TotalShares         int    `json:"total_shares"`
	ReferralSignups     int    `json:"referral_signups"`
	Wins                int    `json:"wins"`
}

type InfluencerRow struct {
	Username     string `json:"username"`
	DisplayName  string `json:"display_name"`
	Followers    int    `json:"followers_count"`
	Referrals    int    `json:"referral_signups"`
	TotalViews   int    `json:"total_views"`
	Published    int    `json:"challenges_published"`
	Score        int    `json:"score"`
}

func (s *Service) TrackChallengeView(ctx context.Context, challengeID uuid.UUID, viewerUserID *uuid.UUID, viewerKey string) error {
	if viewerKey == "" && viewerUserID != nil {
		viewerKey = "user:" + viewerUserID.String()
	}
	if viewerKey == "" {
		viewerKey = "anon"
	}

	var recent bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM challenge_views
			WHERE challenge_id = $1 AND viewer_key = $2 AND created_at > now() - interval '30 minutes'
		)
	`, challengeID, viewerKey).Scan(&recent)
	if err != nil {
		return err
	}
	if recent {
		return nil
	}

	_, err = s.db.Exec(ctx, `
		INSERT INTO challenge_views (id, challenge_id, viewer_user_id, viewer_key)
		VALUES ($1, $2, $3, $4)
	`, uuid.New(), challengeID, viewerUserID, viewerKey)
	if err != nil {
		return err
	}

	var creatorID uuid.UUID
	err = s.db.QueryRow(ctx, `SELECT created_by FROM challenges WHERE id = $1`, challengeID).Scan(&creatorID)
	if err != nil {
		return err
	}
	var views int
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM challenge_views cv
		JOIN challenges c ON c.id = cv.challenge_id
		WHERE c.created_by = $1
	`, creatorID).Scan(&views)
	if views >= 10 {
		_ = s.GrantAchievement(ctx, creatorID, "viral")
	}
	return nil
}

func (s *Service) TrackShare(ctx context.Context, challengeID uuid.UUID, userID *uuid.UUID, channel string) error {
	if channel == "" {
		channel = "link"
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO share_events (id, challenge_id, user_id, channel)
		VALUES ($1, $2, $3, $4)
	`, uuid.New(), challengeID, userID, channel)
	return err
}

func (s *Service) CreatorStats(ctx context.Context, username string) (CreatorStats, error) {
	username = normalizeUsername(username)
	var (
		userID uuid.UUID
		stats  CreatorStats
	)
	err := s.db.QueryRow(ctx, `
		SELECT user_id, username FROM profiles WHERE username = $1
	`, username).Scan(&userID, &stats.Username)
	if err != nil {
		if err == pgx.ErrNoRows {
			return CreatorStats{}, ErrNotFound
		}
		return CreatorStats{}, err
	}

	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM follows WHERE following_id = $1`, userID).Scan(&stats.Followers)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM follows WHERE follower_id = $1`, userID).Scan(&stats.Following)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM challenges WHERE created_by = $1`, userID).Scan(&stats.ChallengesCreated)
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM challenges
		WHERE created_by = $1 AND status IN ('published','in_progress','completed')
	`, userID).Scan(&stats.ChallengesPublished)
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM challenge_views cv
		JOIN challenges c ON c.id = cv.challenge_id
		WHERE c.created_by = $1
	`, userID).Scan(&stats.TotalViews)
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM share_events se
		JOIN challenges c ON c.id = se.challenge_id
		WHERE c.created_by = $1
	`, userID).Scan(&stats.TotalShares)
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM referral_attributions WHERE referrer_user_id = $1
	`, userID).Scan(&stats.ReferralSignups)
	_ = s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(wins), 0) FROM ranking_entries WHERE user_id = $1
	`, userID).Scan(&stats.Wins)

	_ = s.EvaluateGrowthAchievements(ctx, userID, stats)
	return stats, nil
}

func (s *Service) EvaluateGrowthAchievements(ctx context.Context, userID uuid.UUID, stats CreatorStats) error {
	if stats.Followers >= 5 {
		_ = s.GrantAchievement(ctx, userID, "popular")
	}
	if stats.ReferralSignups >= 3 {
		_ = s.GrantAchievement(ctx, userID, "magnet")
	}
	if stats.TotalViews >= 10 {
		_ = s.GrantAchievement(ctx, userID, "viral")
	}
	if stats.ChallengesPublished >= 3 {
		_ = s.GrantAchievement(ctx, userID, "host")
	}
	if stats.Wins >= 1 {
		_ = s.GrantAchievement(ctx, userID, "champion")
	}
	return nil
}

func (s *Service) InfluencerLeaderboard(ctx context.Context, limit int) ([]InfluencerRow, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	rows, err := s.db.Query(ctx, `
		SELECT p.username, p.display_name,
		       COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = p.user_id), 0) AS followers,
		       COALESCE((SELECT COUNT(*) FROM referral_attributions r WHERE r.referrer_user_id = p.user_id), 0) AS referrals,
		       COALESCE((
		         SELECT COUNT(*) FROM challenge_views cv
		         JOIN challenges c ON c.id = cv.challenge_id
		         WHERE c.created_by = p.user_id
		       ), 0) AS views,
		       COALESCE((
		         SELECT COUNT(*) FROM challenges c
		         WHERE c.created_by = p.user_id AND c.status IN ('published','in_progress','completed')
		       ), 0) AS published
		FROM profiles p
		ORDER BY (
		  COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = p.user_id), 0) * 3
		  + COALESCE((SELECT COUNT(*) FROM referral_attributions r WHERE r.referrer_user_id = p.user_id), 0) * 5
		  + COALESCE((
		      SELECT COUNT(*) FROM challenge_views cv
		      JOIN challenges c ON c.id = cv.challenge_id
		      WHERE c.created_by = p.user_id
		    ), 0)
		  + COALESCE((
		      SELECT COUNT(*) FROM challenges c
		      WHERE c.created_by = p.user_id AND c.status IN ('published','in_progress','completed')
		    ), 0) * 2
		) DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []InfluencerRow
	for rows.Next() {
		var row InfluencerRow
		if err := rows.Scan(&row.Username, &row.DisplayName, &row.Followers, &row.Referrals, &row.TotalViews, &row.Published); err != nil {
			return nil, err
		}
		row.Score = row.Followers*3 + row.Referrals*5 + row.TotalViews + row.Published*2
		out = append(out, row)
	}
	if out == nil {
		out = []InfluencerRow{}
	}
	return out, rows.Err()
}

func (s *Service) ChallengeIDBySlug(ctx context.Context, idOrSlug string) (uuid.UUID, error) {
	var id uuid.UUID
	err := s.db.QueryRow(ctx, `
		SELECT id FROM challenges WHERE id::text = $1 OR slug = $1
	`, idOrSlug).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return uuid.Nil, ErrNotFound
		}
		return uuid.Nil, err
	}
	return id, nil
}

func normalizeUsername(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
