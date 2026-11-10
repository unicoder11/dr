package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/community"
	"github.com/google/uuid"
)

type CommunityHandler struct {
	Svc     *community.Service
	SiteURL string
}

func (h CommunityHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	username := strings.ToLower(r.PathValue("username"))
	var viewerID *uuid.UUID
	if u, ok := middleware.UserFromContext(r.Context()); ok {
		id := u.ID
		viewerID = &id
	}
	p, err := h.Svc.GetProfile(r.Context(), username, viewerID)
	if err != nil {
		mapCommunityErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h CommunityHandler) Follow(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if err := h.Svc.Follow(r.Context(), u.ID, r.PathValue("username")); err != nil {
		mapCommunityErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h CommunityHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if err := h.Svc.Unfollow(r.Context(), u.ID, r.PathValue("username")); err != nil {
		mapCommunityErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h CommunityHandler) Followers(w http.ResponseWriter, r *http.Request) {
	list, err := h.Svc.ListFollowers(r.Context(), r.PathValue("username"))
	if err != nil {
		mapCommunityErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h CommunityHandler) Following(w http.ResponseWriter, r *http.Request) {
	list, err := h.Svc.ListFollowing(r.Context(), r.PathValue("username"))
	if err != nil {
		mapCommunityErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h CommunityHandler) MyReferral(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	stats, err := h.Svc.ReferralStats(r.Context(), u.ID, h.SiteURL)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h CommunityHandler) MyAchievements(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	list, err := h.Svc.ListAchievements(r.Context(), u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func mapCommunityErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, community.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, community.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, community.ErrAlreadyFollow):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "already_following"})
	case errors.Is(err, community.ErrNotFollowing):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "not_following"})
	case errors.Is(err, community.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
