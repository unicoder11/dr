-- +goose Up
CREATE TABLE challenge_entry_payments (
    id UUID PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    amount_cents INT NOT NULL CHECK (amount_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL',
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    provider_payment_id TEXT NOT NULL,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT challenge_entry_payments_status_check CHECK (
        status IN ('pending', 'paid', 'failed', 'refunded')
    ),
    CONSTRAINT challenge_entry_payments_method_check CHECK (
        method IN ('pix', 'card', 'waived')
    ),
    UNIQUE (challenge_id, user_id)
);

CREATE INDEX challenge_entry_payments_user_idx
    ON challenge_entry_payments (user_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS challenge_entry_payments;
