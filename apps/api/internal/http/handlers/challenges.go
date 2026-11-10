package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/challenges"
	"github.com/google/uuid"
)

type ChallengesHandler struct {
	Svc *challenges.Service
}

func (h ChallengesHandler) actor(r *http.Request) challenges.IdentityActor {
	if u, ok := middleware.UserFromContext(r.Context()); ok {
		return challenges.Actor(u.ID, u.Roles)
	}
	return challenges.Anonymous()
}

type challengeBody struct {
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	ModalityID      uuid.UUID  `json:"modality_id"`
	ArenaID         uuid.UUID  `json:"arena_id"`
	CompetitionType string     `json:"competition_type"`
	Regulation      string     `json:"regulation"`
	Capacity        int        `json:"capacity"`
	StartsAt        time.Time  `json:"starts_at"`
	EndsAt          *time.Time `json:"ends_at"`
}

func (h ChallengesHandler) ListModalities(w http.ResponseWriter, r *http.Request) {
	list, err := h.Svc.ListModalities(r.Context(), r.URL.Query().Get("all") != "1")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ChallengesHandler) ListArenas(w http.ResponseWriter, r *http.Request) {
	list, err := h.Svc.ListArenas(r.Context(), true)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ChallengesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := challenges.ListFilter{
		ModalitySlug: q.Get("modality"),
		Status:       q.Get("status"),
		OnlyPublic:   q.Get("mine") != "1",
	}
	actor := h.actor(r)
	if q.Get("mine") == "1" {
		u, ok := middleware.UserFromContext(r.Context())
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		id := u.ID
		f.CreatedBy = &id
		f.OnlyPublic = false
	}
	list, err := h.Svc.List(r.Context(), actor, f)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if list == nil {
		list = []challenges.Challenge{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ChallengesHandler) Get(w http.ResponseWriter, r *http.Request) {
	ch, err := h.Svc.Get(r.Context(), r.PathValue("idOrSlug"), h.actor(r))
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ch)
}

func (h ChallengesHandler) Create(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body challengeBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	ch, err := h.Svc.Create(r.Context(), challenges.Actor(u.ID, u.Roles), challenges.CreateInput{
		Title:           body.Title,
		Description:     body.Description,
		ModalityID:      body.ModalityID,
		ArenaID:         body.ArenaID,
		CompetitionType: body.CompetitionType,
		Regulation:      body.Regulation,
		Capacity:        body.Capacity,
		StartsAt:        body.StartsAt,
		EndsAt:          body.EndsAt,
	})
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ch)
}

func (h ChallengesHandler) Update(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body challengeBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	ch, err := h.Svc.Update(r.Context(), challenges.Actor(u.ID, u.Roles), r.PathValue("idOrSlug"), challenges.CreateInput{
		Title:           body.Title,
		Description:     body.Description,
		ModalityID:      body.ModalityID,
		ArenaID:         body.ArenaID,
		CompetitionType: body.CompetitionType,
		Regulation:      body.Regulation,
		Capacity:        body.Capacity,
		StartsAt:        body.StartsAt,
		EndsAt:          body.EndsAt,
	})
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ch)
}

type transitionBody struct {
	Status string `json:"status"`
}

func (h ChallengesHandler) Transition(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body transitionBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Status == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	ch, err := h.Svc.Transition(r.Context(), challenges.Actor(u.ID, u.Roles), r.PathValue("idOrSlug"), body.Status)
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ch)
}

func mapChallengeErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, challenges.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, challenges.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, challenges.ErrInvalidStatus):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "invalid_transition"})
	case errors.Is(err, challenges.ErrModalityInactive):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "modality_inactive"})
	case errors.Is(err, challenges.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
