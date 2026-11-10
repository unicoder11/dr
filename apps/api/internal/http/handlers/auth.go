package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/infra/resend"
	"github.com/desafiosreais/dr/apps/api/internal/modules/community"
	"github.com/desafiosreais/dr/apps/api/internal/modules/identity"
)

type AuthHandler struct {
	Identity  *identity.Service
	Community *community.Service
	Mailer    *resend.Client
	SiteURL   string
	Secure    bool
}

type registerReq struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	Username     string `json:"username"`
	DisplayName  string `json:"display_name"`
	ReferralCode string `json:"referral_code"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	user, err := h.Identity.Register(r.Context(), identity.RegisterInput{
		Email:       req.Email,
		Password:    req.Password,
		Username:    req.Username,
		DisplayName: req.DisplayName,
	})
	if err != nil {
		switch {
		case errors.Is(err, identity.ErrEmailTaken):
			writeJSON(w, http.StatusConflict, map[string]string{"error": "email_taken"})
		case errors.Is(err, identity.ErrUsernameTaken):
			writeJSON(w, http.StatusConflict, map[string]string{"error": "username_taken"})
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return
	}
	if h.Community != nil {
		_ = h.Community.GrantFirstSteps(r.Context(), user.ID)
		_, _ = h.Community.EnsureReferralCode(r.Context(), user.ID)
		if req.ReferralCode != "" {
			_ = h.Community.AttributeReferral(r.Context(), user.ID, req.ReferralCode)
		}
	}
	h.sendWelcome(r.Context(), user)

	// Auto-login so the browser keeps a session right after signup.
	token, logged, err := h.Identity.Login(r.Context(), req.Email, req.Password, r.UserAgent(), r.RemoteAddr)
	if err != nil {
		log.Printf("register auto-login: %v", err)
		writeJSON(w, http.StatusCreated, user)
		return
	}
	h.setSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, logged)
}

func (h AuthHandler) sendWelcome(ctx context.Context, user identity.User) {
	if h.Mailer == nil || !h.Mailer.Enabled() {
		return
	}
	subject, htmlBody, textBody := resend.Welcome(user.DisplayName, user.Username, h.SiteURL)
	if err := h.Mailer.Send(ctx, user.Email, subject, htmlBody, textBody); err != nil {
		log.Printf("welcome email: %v", err)
	}
}

func (h AuthHandler) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     auth.SessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.Secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(30 * 24 * time.Hour),
	})
}

func (h AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	token, user, err := h.Identity.Login(r.Context(), req.Email, req.Password, r.UserAgent(), r.RemoteAddr)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
		return
	}
	h.setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, user)
}

func (h AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(auth.SessionCookieName)
	if err == nil {
		_ = h.Identity.Logout(r.Context(), c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     auth.SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.Secure,
		MaxAge:   -1,
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, u)
}
