package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

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

type payBody struct {
	Method string `json:"method"`
	Holder string `json:"holder"`
	Number string `json:"number"`
	Expiry string `json:"expiry"`
	CVV    string `json:"cvv"`
}

func (h BookingsHandler) Pay(w http.ResponseWriter, r *http.Request) {
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
	var body payBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	method := strings.ToLower(strings.TrimSpace(body.Method))
	last4 := ""
	if method == "card" {
		var msg string
		last4, msg = validateCard(body)
		if msg != "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
			return
		}
	}
	b, err := h.Svc.Pay(r.Context(), actor, id, method, last4)
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

func validateCard(body payBody) (last4, message string) {
	if len(strings.TrimSpace(body.Holder)) < 3 {
		return "", "Informe o nome impresso no cartão."
	}
	var digits strings.Builder
	for _, r := range body.Number {
		if unicode.IsDigit(r) {
			digits.WriteRune(r)
		}
	}
	number := digits.String()
	if len(number) < 13 || len(number) > 19 || !luhnOK(number) {
		return "", "Informe um número de cartão válido."
	}
	exp := strings.TrimSpace(body.Expiry)
	parts := strings.Split(exp, "/")
	if len(parts) != 2 {
		return "", "Informe a validade no formato MM/AA."
	}
	month, errM := strconv.Atoi(strings.TrimSpace(parts[0]))
	year, errY := strconv.Atoi(strings.TrimSpace(parts[1]))
	if errM != nil || errY != nil || month < 1 || month > 12 {
		return "", "Informe a validade no formato MM/AA."
	}
	if year < 100 {
		year += 2000
	}
	expEnd := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC)
	if !expEnd.After(time.Now()) {
		return "", "Este cartão está vencido."
	}
	cvv := strings.TrimSpace(body.CVV)
	if len(cvv) < 3 || len(cvv) > 4 {
		return "", "Informe o CVV."
	}
	for _, r := range cvv {
		if !unicode.IsDigit(r) {
			return "", "Informe o CVV."
		}
	}
	return number[len(number)-4:], ""
}

func luhnOK(number string) bool {
	sum := 0
	alt := false
	for i := len(number) - 1; i >= 0; i-- {
		n := int(number[i] - '0')
		if alt {
			n *= 2
			if n > 9 {
				n -= 9
			}
		}
		sum += n
		alt = !alt
	}
	return sum%10 == 0
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
