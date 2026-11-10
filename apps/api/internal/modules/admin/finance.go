package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/google/uuid"
)

type FinanceOverview struct {
	PaidCents       int            `json:"paid_cents"`
	PaidCount       int            `json:"paid_count"`
	PendingCents    int            `json:"pending_cents"`
	PendingCount    int            `json:"pending_count"`
	RefundedCents   int            `json:"refunded_cents"`
	RefundedCount   int            `json:"refunded_count"`
	FailedCount     int            `json:"failed_count"`
	Last7dPaidCents int            `json:"last_7d_paid_cents"`
	ByKind          map[string]int `json:"by_kind_paid_cents"`
	ByMethod        map[string]int `json:"by_method_paid_cents"`
	SubmissionFee   int            `json:"submission_fee_cents,omitempty"`
	EntryFee        int            `json:"entry_fee_cents,omitempty"`
}

type PaymentRow struct {
	ID                uuid.UUID  `json:"id"`
	Kind              string     `json:"kind"` // submission | entry | booking
	Status            string     `json:"status"`
	Method            string     `json:"method"`
	AmountCents       int        `json:"amount_cents"`
	Currency          string     `json:"currency"`
	ProviderPaymentID string     `json:"provider_payment_id"`
	UserID            uuid.UUID  `json:"user_id"`
	Username          string     `json:"username"`
	Email             string     `json:"email"`
	ChallengeID       *uuid.UUID `json:"challenge_id,omitempty"`
	ChallengeSlug     string     `json:"challenge_slug,omitempty"`
	ChallengeTitle    string     `json:"challenge_title,omitempty"`
	ArenaName         string     `json:"arena_name,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	CanRefund         bool       `json:"can_refund"`
}

type PaymentListFilter struct {
	Kind   string
	Status string
	Method string
	Limit  int
}

func (s *Service) FinanceOverview(ctx context.Context, actorRoles []string) (FinanceOverview, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return FinanceOverview{}, ErrForbidden
	}

	o := FinanceOverview{
		ByKind:   map[string]int{},
		ByMethod: map[string]int{},
	}

	type agg struct {
		status string
		cents  int
		count  int
	}

	add := func(status string, cents, count int) {
		switch status {
		case "paid", "confirmed", "checked_in", "completed":
			o.PaidCents += cents
			o.PaidCount += count
		case "pending", "pending_payment":
			o.PendingCents += cents
			o.PendingCount += count
		case "refunded":
			o.RefundedCents += cents
			o.RefundedCount += count
		case "failed", "cancelled":
			o.FailedCount += count
		}
	}

	rows, err := s.db.Query(ctx, `
		SELECT status, COALESCE(SUM(amount_cents),0)::int, COUNT(*)::int
		FROM challenge_submission_payments
		GROUP BY status
	`)
	if err != nil {
		return FinanceOverview{}, err
	}
	for rows.Next() {
		var a agg
		if err := rows.Scan(&a.status, &a.cents, &a.count); err != nil {
			rows.Close()
			return FinanceOverview{}, err
		}
		add(a.status, a.cents, a.count)
		if a.status == "paid" {
			o.ByKind["submission"] += a.cents
		}
	}
	rows.Close()

	rows, err = s.db.Query(ctx, `
		SELECT status, COALESCE(SUM(amount_cents),0)::int, COUNT(*)::int
		FROM challenge_entry_payments
		GROUP BY status
	`)
	if err != nil {
		return FinanceOverview{}, err
	}
	for rows.Next() {
		var a agg
		if err := rows.Scan(&a.status, &a.cents, &a.count); err != nil {
			rows.Close()
			return FinanceOverview{}, err
		}
		add(a.status, a.cents, a.count)
		if a.status == "paid" {
			o.ByKind["entry"] += a.cents
		}
	}
	rows.Close()

	rows, err = s.db.Query(ctx, `
		SELECT status, COALESCE(SUM(amount_cents),0)::int, COUNT(*)::int
		FROM bookings
		GROUP BY status
	`)
	if err != nil {
		return FinanceOverview{}, err
	}
	for rows.Next() {
		var a agg
		if err := rows.Scan(&a.status, &a.cents, &a.count); err != nil {
			rows.Close()
			return FinanceOverview{}, err
		}
		add(a.status, a.cents, a.count)
		if a.status == "confirmed" || a.status == "checked_in" || a.status == "completed" {
			o.ByKind["booking"] += a.cents
		}
	}
	rows.Close()

	rows, err = s.db.Query(ctx, `
		SELECT method, COALESCE(SUM(amount_cents),0)::int
		FROM (
			SELECT method, amount_cents FROM challenge_submission_payments WHERE status = 'paid'
			UNION ALL
			SELECT method, amount_cents FROM challenge_entry_payments WHERE status = 'paid'
		) t
		GROUP BY method
	`)
	if err != nil {
		return FinanceOverview{}, err
	}
	for rows.Next() {
		var method string
		var cents int
		if err := rows.Scan(&method, &cents); err != nil {
			rows.Close()
			return FinanceOverview{}, err
		}
		o.ByMethod[method] = cents
	}
	rows.Close()

	var bookingPaid int
	_ = s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents),0)::int FROM bookings
		WHERE status IN ('confirmed','checked_in','completed')
	`).Scan(&bookingPaid)
	if bookingPaid > 0 {
		o.ByMethod["mercadopago"] += bookingPaid
	}

	_ = s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents),0)::int FROM (
			SELECT amount_cents, created_at FROM challenge_submission_payments WHERE status = 'paid'
			UNION ALL
			SELECT amount_cents, created_at FROM challenge_entry_payments WHERE status = 'paid'
			UNION ALL
			SELECT amount_cents, created_at FROM bookings WHERE status IN ('confirmed','checked_in','completed')
		) t
		WHERE created_at >= now() - interval '7 days'
	`).Scan(&o.Last7dPaidCents)

	return o, nil
}

func (s *Service) ListPayments(ctx context.Context, actorRoles []string, f PaymentListFilter) ([]PaymentRow, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return nil, ErrForbidden
	}
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 200
	}
	f.Kind = strings.TrimSpace(strings.ToLower(f.Kind))
	f.Status = strings.TrimSpace(strings.ToLower(f.Status))
	f.Method = strings.TrimSpace(strings.ToLower(f.Method))

	includeSubmission := f.Kind == "" || f.Kind == "submission"
	includeEntry := f.Kind == "" || f.Kind == "entry"
	includeBooking := f.Kind == "" || f.Kind == "booking"

	parts := []string{}
	args := []any{}
	argN := 1

	statusClause := func(col string) string {
		if f.Status == "" {
			return ""
		}
		args = append(args, f.Status)
		clause := fmt.Sprintf(" AND %s = $%d", col, argN)
		argN++
		return clause
	}
	methodClause := func(col string) string {
		if f.Method == "" {
			return ""
		}
		args = append(args, f.Method)
		clause := fmt.Sprintf(" AND %s = $%d", col, argN)
		argN++
		return clause
	}

	if includeSubmission {
		parts = append(parts, fmt.Sprintf(`
			SELECT p.id, 'submission'::text AS kind, p.status, p.method, p.amount_cents, p.currency,
			       p.provider_payment_id, p.user_id, COALESCE(pr.username,''), u.email,
			       p.challenge_id, COALESCE(c.slug,''), COALESCE(c.title,''), ''::text AS arena_name,
			       p.created_at
			FROM challenge_submission_payments p
			JOIN users u ON u.id = p.user_id
			LEFT JOIN profiles pr ON pr.user_id = p.user_id
			LEFT JOIN challenges c ON c.id = p.challenge_id
			WHERE 1=1%s%s
		`, statusClause("p.status"), methodClause("p.method")))
	}
	if includeEntry {
		parts = append(parts, fmt.Sprintf(`
			SELECT p.id, 'entry'::text AS kind, p.status, p.method, p.amount_cents, p.currency,
			       p.provider_payment_id, p.user_id, COALESCE(pr.username,''), u.email,
			       p.challenge_id, COALESCE(c.slug,''), COALESCE(c.title,''), ''::text AS arena_name,
			       p.created_at
			FROM challenge_entry_payments p
			JOIN users u ON u.id = p.user_id
			LEFT JOIN profiles pr ON pr.user_id = p.user_id
			LEFT JOIN challenges c ON c.id = p.challenge_id
			WHERE 1=1%s%s
		`, statusClause("p.status"), methodClause("p.method")))
	}
	if includeBooking {
		bookingMethodFilter := ""
		if f.Method != "" {
			if f.Method == "mercadopago" || f.Method == "mp" {
				// always true for bookings
			} else {
				bookingMethodFilter = " AND 1=0"
			}
		}
		parts = append(parts, fmt.Sprintf(`
			SELECT b.id, 'booking'::text AS kind, b.status, 'mercadopago'::text AS method, b.amount_cents, b.currency,
			       COALESCE(b.mp_payment_id, COALESCE(b.mp_preference_id, '')), b.user_id,
			       COALESCE(pr.username,''), u.email,
			       b.challenge_id, COALESCE(c.slug,''), COALESCE(c.title,''), COALESCE(a.name,''),
			       b.created_at
			FROM bookings b
			JOIN users u ON u.id = b.user_id
			LEFT JOIN profiles pr ON pr.user_id = b.user_id
			LEFT JOIN challenges c ON c.id = b.challenge_id
			LEFT JOIN arenas a ON a.id = b.arena_id
			WHERE 1=1%s%s
		`, statusClause("b.status"), bookingMethodFilter))
	}

	if len(parts) == 0 {
		return []PaymentRow{}, nil
	}

	q := fmt.Sprintf(`
		SELECT * FROM (%s) payments
		ORDER BY created_at DESC
		LIMIT %d
	`, strings.Join(parts, " UNION ALL "), f.Limit)

	rows, err := s.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []PaymentRow
	for rows.Next() {
		var r PaymentRow
		if err := rows.Scan(
			&r.ID, &r.Kind, &r.Status, &r.Method, &r.AmountCents, &r.Currency,
			&r.ProviderPaymentID, &r.UserID, &r.Username, &r.Email,
			&r.ChallengeID, &r.ChallengeSlug, &r.ChallengeTitle, &r.ArenaName,
			&r.CreatedAt,
		); err != nil {
			return nil, err
		}
		r.CanRefund = (r.Kind == "submission" || r.Kind == "entry") && r.Status == "paid"
		out = append(out, r)
	}
	if out == nil {
		out = []PaymentRow{}
	}
	return out, rows.Err()
}

func (s *Service) SetPaymentStatus(ctx context.Context, actorID uuid.UUID, actorRoles []string, kind string, paymentID uuid.UUID, status string) (PaymentRow, error) {
	if !auth.HasRole(actorRoles, auth.RoleAdmin) {
		return PaymentRow{}, ErrForbidden
	}
	kind = strings.TrimSpace(strings.ToLower(kind))
	status = strings.TrimSpace(strings.ToLower(status))
	if status != "refunded" && status != "paid" && status != "failed" {
		return PaymentRow{}, ErrInvalidInput
	}

	var table string
	switch kind {
	case "submission":
		table = "challenge_submission_payments"
	case "entry":
		table = "challenge_entry_payments"
	default:
		return PaymentRow{}, ErrInvalidInput
	}

	tag, err := s.db.Exec(ctx, fmt.Sprintf(`UPDATE %s SET status = $2 WHERE id = $1`, table), paymentID, status)
	if err != nil {
		return PaymentRow{}, err
	}
	if tag.RowsAffected() == 0 {
		return PaymentRow{}, ErrNotFound
	}

	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload)
		VALUES ($1,$2,'payment_status_set','payment',$3, jsonb_build_object('kind',$4::text,'status',$5::text))
	`, uuid.New(), actorID, paymentID.String(), kind, status)

	var r PaymentRow
	err = s.db.QueryRow(ctx, fmt.Sprintf(`
		SELECT p.id, $2::text, p.status, p.method, p.amount_cents, p.currency,
		       p.provider_payment_id, p.user_id, COALESCE(pr.username,''), u.email,
		       p.challenge_id, COALESCE(c.slug,''), COALESCE(c.title,''), ''::text,
		       p.created_at
		FROM %s p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN profiles pr ON pr.user_id = p.user_id
		LEFT JOIN challenges c ON c.id = p.challenge_id
		WHERE p.id = $1
	`, table), paymentID, kind).Scan(
		&r.ID, &r.Kind, &r.Status, &r.Method, &r.AmountCents, &r.Currency,
		&r.ProviderPaymentID, &r.UserID, &r.Username, &r.Email,
		&r.ChallengeID, &r.ChallengeSlug, &r.ChallengeTitle, &r.ArenaName,
		&r.CreatedAt,
	)
	if err != nil {
		return PaymentRow{}, err
	}
	r.CanRefund = r.Status == "paid"
	return r, nil
}
