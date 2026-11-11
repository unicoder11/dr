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

func (h AdminHandler) Overview(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	o, err := h.Admin.Overview(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (h AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	users, err := h.Admin.ListUsers(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

type grantRoleReq struct {
	Role string `json:"role"`
}

func (h AdminHandler) GrantRole(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	userID, err := uuid.Parse(r.PathValue("id"))
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
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h AdminHandler) RevokeRole(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	userID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	var req grantRoleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if err := h.Admin.RevokeRole(r.Context(), u.ID, u.Roles, userID, req.Role); err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h AdminHandler) ListFlags(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	flags, err := h.Admin.ListFlags(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, flags)
}

type setFlagReq struct {
	Enabled bool `json:"enabled"`
}

func (h AdminHandler) SetFlag(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	var req setFlagReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	f, err := h.Admin.SetFlag(r.Context(), u.ID, u.Roles, r.PathValue("key"), req.Enabled)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (h AdminHandler) ListChallenges(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	list, err := h.Admin.ListChallenges(r.Context(), u.Roles, r.URL.Query().Get("status"))
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h AdminHandler) ListAudit(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	list, err := h.Admin.ListAudit(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h AdminHandler) ListModalities(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	list, err := h.Admin.ListModalities(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type setModalityReq struct {
	Active bool `json:"active"`
}

func (h AdminHandler) SetModalityActive(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	var req setModalityReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	m, err := h.Admin.SetModalityActive(r.Context(), u.ID, u.Roles, r.PathValue("id"), req.Active)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (h AdminHandler) FinanceOverview(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	o, err := h.Admin.FinanceOverview(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (h AdminHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	q := r.URL.Query()
	list, err := h.Admin.ListPayments(r.Context(), u.Roles, admin.PaymentListFilter{
		Kind:   q.Get("kind"),
		Status: q.Get("status"),
		Method: q.Get("method"),
	})
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type setPaymentStatusReq struct {
	Status string `json:"status"`
}

func (h AdminHandler) SetPaymentStatus(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	paymentID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	var req setPaymentStatusReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	p, err := h.Admin.SetPaymentStatus(r.Context(), u.ID, u.Roles, r.PathValue("kind"), paymentID, req.Status)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h AdminHandler) ListSettings(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	list, err := h.Admin.ListSettings(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type setSettingReq struct {
	ValueInt int `json:"value_int"`
}

func (h AdminHandler) SetSetting(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	var req setSettingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	st, err := h.Admin.SetSettingInt(r.Context(), u.ID, u.Roles, r.PathValue("key"), req.ValueInt)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (h AdminHandler) PotPreview(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	p, err := h.Admin.PotPreview(r.Context(), u.Roles, r.PathValue("idOrSlug"))
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type settleReq struct {
	WinnerUserID uuid.UUID `json:"winner_user_id"`
	Notes        string    `json:"notes"`
}

func (h AdminHandler) SettleChallenge(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	var req settleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.WinnerUserID == uuid.Nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	st, err := h.Admin.SettleChallenge(r.Context(), u.ID, u.Roles, r.PathValue("idOrSlug"), req.WinnerUserID, req.Notes)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (h AdminHandler) ListSettlements(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.UserFromContext(r.Context())
	list, err := h.Admin.ListSettlements(r.Context(), u.Roles)
	if err != nil {
		mapAdminErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func mapAdminErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, admin.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, admin.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, admin.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
