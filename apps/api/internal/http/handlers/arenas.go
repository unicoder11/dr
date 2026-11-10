package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/arenas"
	"github.com/google/uuid"
)

type ArenasHandler struct {
	Svc *arenas.Service
}

func (h ArenasHandler) List(w http.ResponseWriter, r *http.Request) {
	publishedOnly := r.URL.Query().Get("all") != "1"
	if !publishedOnly {
		u, ok := middleware.UserFromContext(r.Context())
		if !ok || !auth.HasRole(u.Roles, auth.RoleAdmin) {
			publishedOnly = true
		}
	}
	list, err := h.Svc.List(r.Context(), publishedOnly)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ArenasHandler) Get(w http.ResponseWriter, r *http.Request) {
	allowUnpublished := false
	if u, ok := middleware.UserFromContext(r.Context()); ok && auth.HasRole(u.Roles, auth.RoleAdmin) {
		allowUnpublished = true
	}
	a, err := h.Svc.Get(r.Context(), r.PathValue("slug"), allowUnpublished)
	if err != nil {
		mapArenaErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

type createArenaBody struct {
	Name            string      `json:"name"`
	Slug            string      `json:"slug"`
	Description     string      `json:"description"`
	City            string      `json:"city"`
	State           string      `json:"state"`
	CapacityDefault int         `json:"capacity_default"`
	ModalityIDs     []uuid.UUID `json:"modality_ids"`
	Publish         bool        `json:"publish"`
}

func (h ArenasHandler) Create(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body createArenaBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	a, err := h.Svc.Create(r.Context(), arenas.Actor{ID: u.ID, Roles: u.Roles}, arenas.CreateInput{
		Name:            body.Name,
		Slug:            body.Slug,
		Description:     body.Description,
		City:            body.City,
		State:           body.State,
		CapacityDefault: body.CapacityDefault,
		ModalityIDs:     body.ModalityIDs,
		Publish:         body.Publish,
	})
	if err != nil {
		mapArenaErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

type publishBody struct {
	Published bool `json:"published"`
}

func (h ArenasHandler) SetPublished(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body publishBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	a, err := h.Svc.SetPublished(r.Context(), arenas.Actor{ID: u.ID, Roles: u.Roles}, r.PathValue("slug"), body.Published)
	if err != nil {
		mapArenaErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func mapArenaErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, arenas.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, arenas.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, arenas.ErrConflict):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "conflict"})
	case errors.Is(err, arenas.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
