package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/challenges"
	"github.com/desafiosreais/dr/apps/api/internal/modules/community"
	"github.com/desafiosreais/dr/apps/api/internal/modules/notifications"
	"github.com/google/uuid"
)

type ParticipantsHandler struct {
	Challenges *challenges.Service
	Notifs     *notifications.Service
	Community  *community.Service
}

func (h ParticipantsHandler) actor(r *http.Request) (challenges.IdentityActor, bool) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		return challenges.Anonymous(), false
	}
	return challenges.Actor(u.ID, u.Roles), true
}

func (h ParticipantsHandler) List(w http.ResponseWriter, r *http.Request) {
	actor, _ := h.actor(r)
	list, err := h.Challenges.ListParticipants(r.Context(), r.PathValue("idOrSlug"), actor)
	if err != nil {
		mapParticipantErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ParticipantsHandler) Join(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	p, err := h.Challenges.Join(r.Context(), actor, r.PathValue("idOrSlug"))
	if err != nil {
		mapParticipantErr(w, err)
		return
	}
	if h.Community != nil {
		_ = h.Community.GrantAchievement(r.Context(), actor.ID, "challenger")
	}
	writeJSON(w, http.StatusOK, p)
}

type inviteBody struct {
	Username string `json:"username"`
}

func (h ParticipantsHandler) Invite(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body inviteBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	p, err := h.Challenges.Invite(r.Context(), actor, r.PathValue("idOrSlug"), body.Username)
	if err != nil {
		mapParticipantErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h ParticipantsHandler) Accept(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	p, err := h.Challenges.AcceptInvite(r.Context(), actor, id)
	if err != nil {
		mapParticipantErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h ParticipantsHandler) Decline(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	p, err := h.Challenges.DeclineInvite(r.Context(), actor, id)
	if err != nil {
		mapParticipantErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h ParticipantsHandler) MyInvites(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	list, err := h.Challenges.MyInvites(r.Context(), actor)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ParticipantsHandler) Calendar(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	list, err := h.Challenges.Calendar(r.Context(), actor)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ParticipantsHandler) Notifications(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	list, err := h.Notifs.List(r.Context(), u.ID, r.URL.Query().Get("unread") == "1")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ParticipantsHandler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	if err := h.Notifs.MarkRead(r.Context(), u.ID, id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func mapParticipantErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, challenges.ErrNotFound), errors.Is(err, challenges.ErrUserNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, challenges.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, challenges.ErrChallengeFull):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "challenge_full"})
	case errors.Is(err, challenges.ErrAlreadyParticipant):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "already_participant"})
	case errors.Is(err, challenges.ErrNotJoinable):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "not_joinable"})
	case errors.Is(err, challenges.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		mapChallengeErr(w, err)
	}
}
