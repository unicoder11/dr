package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/challenges"
	"github.com/desafiosreais/dr/apps/api/internal/modules/community"
	"github.com/google/uuid"
)

type ChallengesHandler struct {
	Svc       *challenges.Service
	Community *community.Service
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
	StakeCents      int        `json:"stake_cents"`
	RaisesAllowed   bool       `json:"raises_allowed"`
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
		ArenaSlug:    q.Get("arena"),
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
		StakeCents:      body.StakeCents,
		RaisesAllowed:   body.RaisesAllowed,
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
		StakeCents:      body.StakeCents,
		RaisesAllowed:   body.RaisesAllowed,
	})
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ch)
}

type coverBody struct {
	AssetID uuid.UUID `json:"asset_id"`
}

func (h ChallengesHandler) SetCover(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body coverBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.AssetID == uuid.Nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	ch, err := h.Svc.SetCover(r.Context(), challenges.Actor(u.ID, u.Roles), r.PathValue("idOrSlug"), body.AssetID)
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
	if h.Community != nil && body.Status == challenges.StatusPublished {
		_ = h.Community.GrantAchievement(r.Context(), u.ID, "challenger")
		if stats, err := h.Community.CreatorStats(r.Context(), u.Username); err == nil {
			_ = h.Community.EvaluateGrowthAchievements(r.Context(), u.ID, stats)
		}
	}
	writeJSON(w, http.StatusOK, ch)
}

type paySubmitBody struct {
	Method string `json:"method"`
	Holder string `json:"holder"`
	Number string `json:"number"`
	Expiry string `json:"expiry"`
	CVV    string `json:"cvv"`
}

func (h ChallengesHandler) PayAndSubmit(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body paySubmitBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	method := strings.ToLower(strings.TrimSpace(body.Method))
	last4 := ""
	if method == "card" {
		digits := onlyDigits(body.Number)
		if len(digits) < 13 || len(body.CVV) < 3 || strings.TrimSpace(body.Holder) == "" || strings.TrimSpace(body.Expiry) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_card"})
			return
		}
		if len(digits) >= 4 {
			last4 = digits[len(digits)-4:]
		}
	}
	ch, err := h.Svc.PayAndSubmit(r.Context(), challenges.Actor(u.ID, u.Roles), r.PathValue("idOrSlug"), method, last4)
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ch)
}

func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

type proposeRaiseBody struct {
	StakeCents int `json:"stake_cents"`
}

func (h ChallengesHandler) ProposeRaise(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body proposeRaiseBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.StakeCents <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	raise, err := h.Svc.ProposeRaise(r.Context(), challenges.Actor(u.ID, u.Roles), r.PathValue("idOrSlug"), body.StakeCents)
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, raise)
}

func (h ChallengesHandler) ListRaises(w http.ResponseWriter, r *http.Request) {
	list, err := h.Svc.ListRaises(r.Context(), h.actor(r), r.PathValue("idOrSlug"))
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h ChallengesHandler) AcceptRaise(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	raiseID, err := uuid.Parse(r.PathValue("raiseID"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	raise, err := h.Svc.ResolveRaise(r.Context(), challenges.Actor(u.ID, u.Roles), raiseID, true)
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, raise)
}

func (h ChallengesHandler) RefuseRaise(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	raiseID, err := uuid.Parse(r.PathValue("raiseID"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	raise, err := h.Svc.ResolveRaise(r.Context(), challenges.Actor(u.ID, u.Roles), raiseID, false)
	if err != nil {
		mapChallengeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, raise)
}

func (h ChallengesHandler) PayStakeTopUp(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body paySubmitBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	method := strings.ToLower(strings.TrimSpace(body.Method))
	last4 := ""
	if method == "card" && len(body.Number) >= 4 {
		last4 = body.Number[len(body.Number)-4:]
	}
	ch, err := h.Svc.PayStakeTopUp(r.Context(), challenges.Actor(u.ID, u.Roles), r.PathValue("idOrSlug"), method, last4)
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
	case errors.Is(err, challenges.ErrPaymentRequired):
		writeJSON(w, http.StatusPaymentRequired, map[string]string{"error": "payment_required"})
	case errors.Is(err, challenges.ErrAlreadyPaid):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "already_paid"})
	case errors.Is(err, challenges.ErrRaiseNotAllowed):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "raise_not_allowed"})
	case errors.Is(err, challenges.ErrRaisePending):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "raise_pending"})
	case errors.Is(err, challenges.ErrModalityInactive):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "modality_inactive"})
	case errors.Is(err, challenges.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
