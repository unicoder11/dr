package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/bookings"
	"github.com/google/uuid"
)

type BookingsHandler struct {
	Svc     *bookings.Service
	SiteURL string
}

func (h BookingsHandler) actor(r *http.Request) (bookings.Actor, bool) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		return bookings.Actor{}, false
	}
	return bookings.Actor{ID: u.ID, Roles: u.Roles}, true
}

func (h BookingsHandler) ListSlots(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	list, err := h.Svc.ListSlots(r.Context(), q.Get("arena"), q.Get("modality"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type createBookingBody struct {
	SlotID uuid.UUID `json:"slot_id"`
}

func (h BookingsHandler) Create(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body createBookingBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.SlotID == uuid.Nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	b, err := h.Svc.Create(r.Context(), actor, body.SlotID)
	if err != nil {
		mapBookingErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, b)
}

func (h BookingsHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.actor(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	list, err := h.Svc.ListMine(r.Context(), actor)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h BookingsHandler) Cancel(w http.ResponseWriter, r *http.Request) {
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
	b, err := h.Svc.Cancel(r.Context(), actor, id)
	if err != nil {
		mapBookingErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
}

func (h BookingsHandler) MockCheckout(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	_, err = h.Svc.ConfirmMockCheckout(r.Context(), id)
	if err != nil {
		mapBookingErr(w, err)
		return
	}
	http.Redirect(w, r, h.SiteURL+"/app/reservas?status=success", http.StatusFound)
}

func (h BookingsHandler) MercadoPagoWebhook(w http.ResponseWriter, r *http.Request) {
	paymentID := r.URL.Query().Get("data.id")
	if paymentID == "" {
		paymentID = r.URL.Query().Get("id")
	}
	if paymentID == "" && r.Method == http.MethodPost {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if data, ok := body["data"].(map[string]any); ok {
			if id, ok := data["id"].(string); ok {
				paymentID = id
			} else if idNum, ok := data["id"].(float64); ok {
				paymentID = strconv.FormatInt(int64(idNum), 10)
			}
		}
		if paymentID == "" {
			if id, ok := body["id"].(string); ok {
				paymentID = id
			}
		}
	}
	if paymentID == "" {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}
	if err := h.Svc.HandleMPWebhook(r.Context(), paymentID); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func mapBookingErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, bookings.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, bookings.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, bookings.ErrSlotFull):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "slot_full"})
	case errors.Is(err, bookings.ErrSlotClosed):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "slot_closed"})
	case errors.Is(err, bookings.ErrNotCancelable):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "not_cancelable"})
	case errors.Is(err, bookings.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
