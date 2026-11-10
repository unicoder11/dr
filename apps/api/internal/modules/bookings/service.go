package bookings

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/desafiosreais/dr/apps/api/internal/infra/mercadopago"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrForbidden     = errors.New("forbidden")
	ErrInvalidInput  = errors.New("invalid input")
	ErrSlotFull      = errors.New("slot_full")
	ErrSlotClosed    = errors.New("slot_closed")
	ErrNotCancelable = errors.New("not_cancelable")
	ErrP2PDisabled   = errors.New("p2p_prizes_disabled")
)

type Service struct {
	db        *pgxpool.Pool
	mp        *mercadopago.Client
	publicURL string
	siteURL   string
	appEnv    string
	p2pOff    bool
}

func NewService(db *pgxpool.Pool, mp *mercadopago.Client, publicURL, siteURL, appEnv string, p2pOff bool) *Service {
	return &Service{
		db:        db,
		mp:        mp,
		publicURL: strings.TrimRight(publicURL, "/"),
		siteURL:   strings.TrimRight(siteURL, "/"),
		appEnv:    appEnv,
		p2pOff:    p2pOff,
	}
}

type Actor struct {
	ID    uuid.UUID
	Roles []string
}

type Slot struct {
	ID           uuid.UUID `json:"id"`
	ArenaID      uuid.UUID `json:"arena_id"`
	ArenaName    string    `json:"arena_name"`
	ModalityID   uuid.UUID `json:"modality_id"`
	ModalitySlug string    `json:"modality_slug"`
	ModalityName string    `json:"modality_name"`
	StartsAt     time.Time `json:"starts_at"`
	EndsAt       time.Time `json:"ends_at"`
	Capacity     int       `json:"capacity"`
	BookedCount  int       `json:"booked_count"`
	PriceCents   int       `json:"price_cents"`
	Status       string    `json:"status"`
	Available    bool      `json:"available"`
}

type Booking struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	ArenaID        uuid.UUID  `json:"arena_id"`
	ArenaName      string     `json:"arena_name"`
	SlotID         *uuid.UUID `json:"slot_id,omitempty"`
	StartsAt       *time.Time `json:"starts_at,omitempty"`
	EndsAt         *time.Time `json:"ends_at,omitempty"`
	ModalityName   string     `json:"modality_name,omitempty"`
	Status         string     `json:"status"`
	AmountCents    int        `json:"amount_cents"`
	Currency       string     `json:"currency"`
	MPPreferenceID *string    `json:"mp_preference_id,omitempty"`
	CheckoutURL    *string    `json:"checkout_url,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (s *Service) ListSlots(ctx context.Context, arenaSlug, modalitySlug string) ([]Slot, error) {
	args := []any{}
	where := []string{"s.status = 'open'", "s.starts_at > now()"}
	if arenaSlug != "" {
		args = append(args, arenaSlug)
		where = append(where, fmt.Sprintf("a.slug = $%d", len(args)))
	}
	if modalitySlug != "" {
		args = append(args, modalitySlug)
		where = append(where, fmt.Sprintf("m.slug = $%d", len(args)))
	}
	q := fmt.Sprintf(`
		SELECT s.id, s.arena_id, a.name, s.modality_id, m.slug, m.name,
		       s.starts_at, s.ends_at, s.capacity, s.price_cents, s.status,
		       COALESCE((
		         SELECT COUNT(*) FROM bookings b
		         WHERE b.slot_id = s.id AND b.status IN ('pending_payment','confirmed','checked_in','completed')
		       ), 0)
		FROM availability_slots s
		JOIN arenas a ON a.id = s.arena_id
		JOIN modalities m ON m.id = s.modality_id
		WHERE %s
		ORDER BY s.starts_at ASC
		LIMIT 100
	`, strings.Join(where, " AND "))
	rows, err := s.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Slot
	for rows.Next() {
		var sl Slot
		if err := rows.Scan(&sl.ID, &sl.ArenaID, &sl.ArenaName, &sl.ModalityID, &sl.ModalitySlug, &sl.ModalityName,
			&sl.StartsAt, &sl.EndsAt, &sl.Capacity, &sl.PriceCents, &sl.Status, &sl.BookedCount); err != nil {
			return nil, err
		}
		sl.Available = sl.BookedCount < sl.Capacity && sl.Status == "open"
		out = append(out, sl)
	}
	if out == nil {
		out = []Slot{}
	}
	return out, rows.Err()
}

func (s *Service) Create(ctx context.Context, actor Actor, slotID uuid.UUID) (Booking, error) {
	// Commercial bookings are always allowed; P2P prize flows stay disabled via FlagP2PPrizes.
	_ = s.p2pOff
	_ = ErrP2PDisabled

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback(ctx)

	var (
		arenaID    uuid.UUID
		capacity   int
		price      int
		status     string
		startsAt   time.Time
		modalityID uuid.UUID
	)
	err = tx.QueryRow(ctx, `
		SELECT arena_id, modality_id, capacity, price_cents, status, starts_at
		FROM availability_slots WHERE id = $1 FOR UPDATE
	`, slotID).Scan(&arenaID, &modalityID, &capacity, &price, &status, &startsAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Booking{}, ErrNotFound
		}
		return Booking{}, err
	}
	if status != "open" || !startsAt.After(time.Now()) {
		return Booking{}, ErrSlotClosed
	}
	var booked int
	err = tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM bookings
		WHERE slot_id = $1 AND status IN ('pending_payment','confirmed','checked_in','completed')
	`, slotID).Scan(&booked)
	if err != nil {
		return Booking{}, err
	}
	if booked >= capacity {
		return Booking{}, ErrSlotFull
	}

	id := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO bookings (id, user_id, arena_id, slot_id, status, amount_cents, currency)
		VALUES ($1,$2,$3,$4,'pending_payment',$5,'BRL')
	`, id, actor.ID, arenaID, slotID, price)
	if err != nil {
		return Booking{}, err
	}

	checkoutURL := fmt.Sprintf("%s/app/reservas/pagar/%s", s.siteURL, id.String())
	prefID := "local-" + id.String()

	if s.mp != nil && s.mp.Enabled() {
		pref, err := s.mp.CreatePreference(ctx, mercadopago.PreferenceRequest{
			Items: []mercadopago.PreferenceItem{{
				Title:     "Reserva DESAFIOS REAIS",
				Quantity:  1,
				Currency:  "BRL",
				UnitPrice: float64(price) / 100.0,
			}},
			ExternalReference: id.String(),
			NotificationURL:   s.publicURL + "/api/v1/webhooks/mercadopago",
			BackURLs: map[string]string{
				"success": s.siteURL + "/app/reservas?status=success",
				"failure": s.siteURL + "/app/reservas?status=failure",
				"pending": s.siteURL + "/app/reservas?status=pending",
			},
			AutoReturn: "approved",
		})
		if err != nil {
			return Booking{}, err
		}
		prefID = pref.ID
	}

	_, err = tx.Exec(ctx, `
		UPDATE bookings SET mp_preference_id = $2, checkout_url = $3, updated_at = now()
		WHERE id = $1
	`, id, prefID, checkoutURL)
	if err != nil {
		return Booking{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return s.Get(ctx, actor, id)
}

func (s *Service) Get(ctx context.Context, actor Actor, id uuid.UUID) (Booking, error) {
	b, err := s.scanBooking(ctx, id)
	if err != nil {
		return Booking{}, err
	}
	if b.UserID != actor.ID && !auth.HasAnyRole(actor.Roles, auth.RoleAdmin, auth.RoleArenaOperator) {
		return Booking{}, ErrForbidden
	}
	return b, nil
}

func (s *Service) ListMine(ctx context.Context, actor Actor) ([]Booking, error) {
	rows, err := s.db.Query(ctx, `
		SELECT b.id, b.user_id, b.arena_id, a.name, b.slot_id, s.starts_at, s.ends_at, m.name,
		       b.status, b.amount_cents, b.currency, b.mp_preference_id, b.checkout_url, b.created_at
		FROM bookings b
		JOIN arenas a ON a.id = b.arena_id
		LEFT JOIN availability_slots s ON s.id = b.slot_id
		LEFT JOIN modalities m ON m.id = s.modality_id
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC
		LIMIT 100
	`, actor.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Booking
	for rows.Next() {
		b, err := scanBookingRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	if out == nil {
		out = []Booking{}
	}
	return out, rows.Err()
}

func (s *Service) Cancel(ctx context.Context, actor Actor, id uuid.UUID) (Booking, error) {
	b, err := s.Get(ctx, actor, id)
	if err != nil {
		return Booking{}, err
	}
	if b.Status != "pending_payment" && b.Status != "confirmed" {
		return Booking{}, ErrNotCancelable
	}
	_, err = s.db.Exec(ctx, `
		UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1
	`, id)
	if err != nil {
		return Booking{}, err
	}
	return s.Get(ctx, actor, id)
}

func (s *Service) Pay(ctx context.Context, actor Actor, id uuid.UUID, method, last4 string) (Booking, error) {
	if method != "pix" && method != "card" {
		return Booking{}, ErrInvalidInput
	}
	b, err := s.Get(ctx, actor, id)
	if err != nil {
		return Booking{}, err
	}
	if b.Status == "confirmed" || b.Status == "checked_in" || b.Status == "completed" {
		return b, nil
	}
	if b.Status != "pending_payment" {
		return Booking{}, ErrNotCancelable
	}
	payload := map[string]string{"method": method}
	if last4 != "" {
		payload["last4"] = last4
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return Booking{}, err
	}
	return s.confirmPayment(ctx, id, method+"-"+id.String(), "approved", raw)
}

func (s *Service) ConfirmMockCheckout(ctx context.Context, bookingID uuid.UUID) (Booking, error) {
	if s.mp != nil && s.mp.Enabled() && s.appEnv == "production" {
		return Booking{}, ErrForbidden
	}
	paymentID := "mock-pay-" + bookingID.String()
	return s.confirmPayment(ctx, bookingID, paymentID, "approved", json.RawMessage(`{"mock":true}`))
}

func (s *Service) HandleMPWebhook(ctx context.Context, paymentID string) error {
	if paymentID == "" {
		return ErrInvalidInput
	}
	if s.mp == nil || !s.mp.Enabled() {
		return fmt.Errorf("mercadopago not configured")
	}
	pay, raw, err := s.mp.GetPayment(ctx, paymentID)
	if err != nil {
		return err
	}
	if pay.ExternalReference == "" {
		return ErrInvalidInput
	}
	bookingID, err := uuid.Parse(pay.ExternalReference)
	if err != nil {
		return ErrInvalidInput
	}
	if pay.Status != "approved" {
		// store payment attempt but don't confirm
		_, _ = s.db.Exec(ctx, `
			INSERT INTO payments (id, booking_id, provider, provider_payment_id, status, raw_payload)
			VALUES ($1,$2,'mercadopago',$3,$4,$5::jsonb)
			ON CONFLICT (provider, provider_payment_id) DO UPDATE SET status = EXCLUDED.status, raw_payload = EXCLUDED.raw_payload
		`, uuid.New(), bookingID, paymentID, pay.Status, raw)
		return nil
	}
	_, err = s.confirmPayment(ctx, bookingID, paymentID, pay.Status, raw)
	return err
}

func (s *Service) confirmPayment(ctx context.Context, bookingID uuid.UUID, paymentID, status string, raw json.RawMessage) (Booking, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback(ctx)

	var current string
	err = tx.QueryRow(ctx, `SELECT status FROM bookings WHERE id = $1 FOR UPDATE`, bookingID).Scan(&current)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Booking{}, ErrNotFound
		}
		return Booking{}, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO payments (id, booking_id, provider, provider_payment_id, status, raw_payload)
		VALUES ($1,$2,'mercadopago',$3,$4,$5::jsonb)
		ON CONFLICT (provider, provider_payment_id) DO NOTHING
	`, uuid.New(), bookingID, paymentID, status, raw)
	if err != nil {
		return Booking{}, err
	}

	if current == "confirmed" || current == "checked_in" || current == "completed" {
		if err := tx.Commit(ctx); err != nil {
			return Booking{}, err
		}
		return s.scanBooking(ctx, bookingID)
	}
	if current != "pending_payment" {
		return Booking{}, ErrNotCancelable
	}

	_, err = tx.Exec(ctx, `
		UPDATE bookings
		SET status = 'confirmed', mp_payment_id = $2, updated_at = now()
		WHERE id = $1
	`, bookingID, paymentID)
	if err != nil {
		return Booking{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return s.scanBooking(ctx, bookingID)
}

type scannable interface {
	Scan(dest ...any) error
}

func (s *Service) scanBooking(ctx context.Context, id uuid.UUID) (Booking, error) {
	row := s.db.QueryRow(ctx, `
		SELECT b.id, b.user_id, b.arena_id, a.name, b.slot_id, s.starts_at, s.ends_at, m.name,
		       b.status, b.amount_cents, b.currency, b.mp_preference_id, b.checkout_url, b.created_at
		FROM bookings b
		JOIN arenas a ON a.id = b.arena_id
		LEFT JOIN availability_slots s ON s.id = b.slot_id
		LEFT JOIN modalities m ON m.id = s.modality_id
		WHERE b.id = $1
	`, id)
	b, err := scanBookingRow(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Booking{}, ErrNotFound
		}
		return Booking{}, err
	}
	return b, nil
}

func scanBookingRow(row scannable) (Booking, error) {
	var b Booking
	var modality *string
	err := row.Scan(&b.ID, &b.UserID, &b.ArenaID, &b.ArenaName, &b.SlotID, &b.StartsAt, &b.EndsAt, &modality,
		&b.Status, &b.AmountCents, &b.Currency, &b.MPPreferenceID, &b.CheckoutURL, &b.CreatedAt)
	if modality != nil {
		b.ModalityName = *modality
	}
	return b, err
}
