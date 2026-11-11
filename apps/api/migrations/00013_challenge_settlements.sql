-- +goose Up
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value_int INT,
    value_text TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (key, value_int)
VALUES ('pot_platform_fee_bps', 1000) -- 10.00%
ON CONFLICT (key) DO NOTHING;

CREATE TABLE challenge_settlements (
    id UUID PRIMARY KEY,
    challenge_id UUID NOT NULL UNIQUE REFERENCES challenges(id) ON DELETE CASCADE,
    winner_user_id UUID NOT NULL REFERENCES users(id),
    pot_cents INT NOT NULL CHECK (pot_cents >= 0),
    platform_fee_bps INT NOT NULL CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 10000),
    platform_fee_cents INT NOT NULL CHECK (platform_fee_cents >= 0),
    winner_payout_cents INT NOT NULL CHECK (winner_payout_cents >= 0),
    status TEXT NOT NULL DEFAULT 'released',
    released_by UUID NULL REFERENCES users(id),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT challenge_settlements_status_check CHECK (
        status IN ('released', 'void')
    ),
    CONSTRAINT challenge_settlements_split_check CHECK (
        platform_fee_cents + winner_payout_cents = pot_cents
    )
);

CREATE INDEX challenge_settlements_winner_idx
    ON challenge_settlements (winner_user_id, created_at DESC);

CREATE INDEX challenge_settlements_created_idx
    ON challenge_settlements (created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS challenge_settlements;
DROP TABLE IF EXISTS platform_settings;
