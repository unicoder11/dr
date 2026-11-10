package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/ops"
	"github.com/google/uuid"
)

type OpsHandler struct {
	Svc *ops.Service
}

func (h OpsHandler) actor(r *http.Request) (ops.Actor, bool) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		return ops.Actor{}, false
	}
	return ops.Actor{ID: u.ID, Roles: u.Roles}, true
}

func (h OpsHandler) Agenda(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	list, err := h.Svc.AgendaToday(r.Context(), actor)
	if err != nil {
		mapOpsErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type checkInBody struct {
	ParticipantID *uuid.UUID `json:"participant_id"`
	BookingID     *uuid.UUID `json:"booking_id"`
}

func (h OpsHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body checkInBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	var err error
	switch {
	case body.ParticipantID != nil:
		err = h.Svc.CheckInParticipant(r.Context(), actor, *body.ParticipantID)
	case body.BookingID != nil:
		err = h.Svc.CheckInBooking(r.Context(), actor, *body.BookingID)
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
		return
	}
	if err != nil {
		mapOpsErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h OpsHandler) StartChallenge(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if err := h.Svc.StartChallenge(r.Context(), actor, r.PathValue("idOrSlug")); err != nil {
		mapOpsErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h OpsHandler) UpsertResult(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var payload ops.ResultPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	res, err := h.Svc.UpsertResult(r.Context(), actor, r.PathValue("idOrSlug"), payload)
	if err != nil {
		mapOpsErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h OpsHandler) ValidateResult(w http.ResponseWriter, r *http.Request) {
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
	res, err := h.Svc.ValidateResult(r.Context(), actor, id)
	if err != nil {
		mapOpsErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h OpsHandler) GetResult(w http.ResponseWriter, r *http.Request) {
	res, err := h.Svc.GetResultByChallenge(r.Context(), r.PathValue("idOrSlug"))
	if err != nil {
		mapOpsErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h OpsHandler) Rankings(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	list, err := h.Svc.ListRankings(r.Context(), q.Get("modality"), q.Get("season"), 50)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func mapOpsErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ops.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, ops.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, ops.ErrConflict):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "conflict"})
	case errors.Is(err, ops.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
