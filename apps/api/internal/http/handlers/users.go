package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UsersHandler struct {
	DB *pgxpool.Pool
}

type publicProfile struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Bio         string `json:"bio"`
	City        string `json:"city"`
}

func (h UsersHandler) GetByUsername(w http.ResponseWriter, r *http.Request) {
	username := strings.ToLower(r.PathValue("username"))
	var p publicProfile
	err := h.DB.QueryRow(r.Context(), `
		SELECT username, display_name, COALESCE(bio, ''), COALESCE(city, '')
		FROM profiles WHERE username = $1
	`, username).Scan(&p.Username, &p.DisplayName, &p.Bio, &p.City)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type updateProfileReq struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	City        *string `json:"city"`
}

func (h UsersHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var req updateProfileReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	_, err := h.DB.Exec(r.Context(), `
		UPDATE profiles SET
			display_name = COALESCE($2, display_name),
			bio = COALESCE($3, bio),
			city = COALESCE($4, city),
			updated_at = now()
		WHERE user_id = $1
	`, u.ID, req.DisplayName, req.Bio, req.City)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
