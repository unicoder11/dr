-- +goose Up
ALTER TABLE challenges
    ADD COLUMN IF NOT EXISTS stake_cents INT NOT NULL DEFAULT 9900,
    ADD COLUMN IF NOT EXISTS raises_allowed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE challenges
    DROP CONSTRAINT IF EXISTS challenges_stake_cents_check;
ALTER TABLE challenges
    ADD CONSTRAINT challenges_stake_cents_check CHECK (stake_cents >= 1000);

-- Allow multiple paid submission rows (base stake + top-ups after raises).
DROP INDEX IF EXISTS challenge_submission_payments_paid_challenge_uidx;

CREATE TABLE challenge_stake_raises (
    id UUID PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    proposed_by UUID NOT NULL REFERENCES users(id),
    from_stake_cents INT NOT NULL CHECK (from_stake_cents >= 0),
    to_stake_cents INT NOT NULL CHECK (to_stake_cents > from_stake_cents),
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by UUID NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ NULL,
    CONSTRAINT challenge_stake_raises_status_check CHECK (
        status IN ('pending', 'accepted', 'refused', 'cancelled')
    )
);

CREATE UNIQUE INDEX challenge_stake_raises_one_pending_uidx
    ON challenge_stake_raises (challenge_id)
    WHERE status = 'pending';

CREATE INDEX challenge_stake_raises_challenge_idx
    ON challenge_stake_raises (challenge_id, created_at DESC);

CREATE INDEX challenge_stake_raises_proposer_idx
    ON challenge_stake_raises (proposed_by, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS challenge_stake_raises;
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_stake_cents_check;
ALTER TABLE challenges DROP COLUMN IF EXISTS raises_allowed;
ALTER TABLE challenges DROP COLUMN IF EXISTS stake_cents;
CREATE UNIQUE INDEX challenge_submission_payments_paid_challenge_uidx
    ON challenge_submission_payments (challenge_id)
    WHERE status = 'paid';
