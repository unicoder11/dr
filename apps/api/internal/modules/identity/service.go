package identity

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already registered")
	ErrUsernameTaken      = errors.New("username already taken")
	ErrNotFound           = errors.New("not found")
	ErrUnauthorized       = errors.New("unauthorized")
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type User struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	Username      string    `json:"username"`
	DisplayName   string    `json:"display_name"`
	Roles         []string  `json:"roles"`
	EmailVerified bool      `json:"email_verified"`
}

type RegisterInput struct {
	Email       string
	Password    string
	Username    string
	DisplayName string
}

func (s *Service) Register(ctx context.Context, in RegisterInput) (User, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	username := strings.ToLower(strings.TrimSpace(in.Username))
	display := strings.TrimSpace(in.DisplayName)
	if display == "" {
		display = username
	}
	if email == "" || username == "" || len(in.Password) < 8 {
		return User{}, fmt.Errorf("%w: email, username and password(min 8) required", ErrInvalidCredentials)
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return User{}, err
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	userID := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, status, is_demo)
		VALUES ($1, $2, $3, 'active', false)
	`, userID, email, hash)
	if err != nil {
		if strings.Contains(err.Error(), "users_email_key") {
			return User{}, ErrEmailTaken
		}
		return User{}, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO profiles (user_id, display_name, username)
		VALUES ($1, $2, $3)
	`, userID, display, username)
	if err != nil {
		if strings.Contains(err.Error(), "profiles_username_key") {
			return User{}, ErrUsernameTaken
		}
		return User{}, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
	`, userID, auth.RoleParticipant)
	if err != nil {
		return User{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}

	return User{
		ID:          userID,
		Email:       email,
		Username:    username,
		DisplayName: display,
		Roles:       []string{auth.RoleParticipant},
	}, nil
}

func (s *Service) Login(ctx context.Context, email, password, userAgent, ip string) (token string, user User, err error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var (
		id   uuid.UUID
		hash string
	)
	err = s.db.QueryRow(ctx, `
		SELECT id, password_hash FROM users
		WHERE email = $1 AND status = 'active'
	`, email).Scan(&id, &hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", User{}, ErrInvalidCredentials
		}
		return "", User{}, err
	}
	if !auth.CheckPassword(hash, password) {
		return "", User{}, ErrInvalidCredentials
	}

	token, tokenHash, err := auth.NewSessionToken()
	if err != nil {
		return "", User{}, err
	}
	expires := time.Now().UTC().Add(30 * 24 * time.Hour)
	_, err = s.db.Exec(ctx, `
		INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent, ip)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, uuid.New(), id, tokenHash, expires, userAgent, ip)
	if err != nil {
		return "", User{}, err
	}

	user, err = s.GetUser(ctx, id)
	if err != nil {
		return "", User{}, err
	}
	return token, user, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	_, err := s.db.Exec(ctx, `
		UPDATE sessions SET revoked_at = now()
		WHERE token_hash = $1 AND revoked_at IS NULL
	`, auth.HashToken(token))
	return err
}

func (s *Service) UserFromSession(ctx context.Context, token string) (User, error) {
	if token == "" {
		return User{}, ErrUnauthorized
	}
	var userID uuid.UUID
	err := s.db.QueryRow(ctx, `
		SELECT user_id FROM sessions
		WHERE token_hash = $1
		  AND revoked_at IS NULL
		  AND expires_at > now()
	`, auth.HashToken(token)).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrUnauthorized
		}
		return User{}, err
	}
	return s.GetUser(ctx, userID)
}

func (s *Service) GetUser(ctx context.Context, id uuid.UUID) (User, error) {
	var u User
	var verified *time.Time
	err := s.db.QueryRow(ctx, `
		SELECT u.id, u.email, p.username, p.display_name, u.email_verified_at
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		WHERE u.id = $1
	`, id).Scan(&u.ID, &u.Email, &u.Username, &u.DisplayName, &verified)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	u.EmailVerified = verified != nil
	roles, err := s.rolesFor(ctx, id)
	if err != nil {
		return User{}, err
	}
	u.Roles = roles
	return u, nil
}

func (s *Service) rolesFor(ctx context.Context, userID uuid.UUID) ([]string, error) {
	rows, err := s.db.Query(ctx, `SELECT role FROM user_roles WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var roles []string
	for rows.Next() {
		var r string
		if err := rows.Scan(&r); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, rows.Err()
}

func (s *Service) EnsureAdmin(ctx context.Context, email, password, username string) error {
	if email == "" || password == "" {
		return nil
	}
	var exists bool
	err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, strings.ToLower(email)).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	user, err := s.Register(ctx, RegisterInput{
		Email:       email,
		Password:    password,
		Username:    username,
		DisplayName: "Admin",
	})
	if err != nil {
		return err
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, user.ID, auth.RoleAdmin)
	return err
}
