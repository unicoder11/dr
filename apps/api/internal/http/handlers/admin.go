package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/admin"
	"github.com/google/uuid"
)

type AdminHandler struct {
	Admin *admin.Service
}

func (h AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	users, err := h.Admin.ListUsers(r.Context(), u.Roles)
	if err != nil {
		if errors.Is(err, admin.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, users)
}

type grantRoleReq struct {
	Role string `json:"role"`
}

func (h AdminHandler) GrantRole(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	idStr := r.PathValue("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	var req grantRoleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if err := h.Admin.GrantRole(r.Context(), u.ID, u.Roles, userID, req.Role); err != nil {
		if errors.Is(err, admin.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h AdminHandler) ListFlags(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	flags, err := h.Admin.ListFlags(r.Context(), u.Roles)
	if err != nil {
		if errors.Is(err, admin.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, flags)
}
