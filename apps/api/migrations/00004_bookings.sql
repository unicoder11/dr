-- +goose Up
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY,
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    modality_id UUID NOT NULL REFERENCES modalities(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT availability_slots_status_check CHECK (status IN ('open', 'closed')),
    CONSTRAINT availability_slots_range_check CHECK (ends_at > starts_at)
);

CREATE INDEX availability_slots_arena_starts_idx ON availability_slots (arena_id, starts_at);
CREATE INDEX availability_slots_status_starts_idx ON availability_slots (status, starts_at);

CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    arena_id UUID NOT NULL REFERENCES arenas(id),
    slot_id UUID NULL REFERENCES availability_slots(id),
    challenge_id UUID NULL REFERENCES challenges(id),
    status TEXT NOT NULL DEFAULT 'pending_payment',
    amount_cents INT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    mp_preference_id TEXT NULL,
    mp_payment_id TEXT NULL,
    checkout_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bookings_status_check CHECK (
        status IN (
            'pending_payment',
            'confirmed',
            'cancelled',
            'checked_in',
            'completed',
            'refunded'
        )
    )
);

CREATE INDEX bookings_user_created_idx ON bookings (user_id, created_at DESC);
CREATE INDEX bookings_slot_status_idx ON bookings (slot_id, status);
CREATE INDEX bookings_mp_preference_idx ON bookings (mp_preference_id);

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'mercadopago',
    provider_payment_id TEXT NOT NULL,
    status TEXT NOT NULL,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_payment_id)
);

-- Seed upcoming open slots for Super Mountain Kart (kart + gravity)
INSERT INTO availability_slots (id, arena_id, modality_id, starts_at, ends_at, capacity, price_cents, status)
SELECT
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    m.id,
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + (d || ' days')::interval + (h || ' hours')::interval)
        AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + (d || ' days')::interval + ((h + 1) || ' hours')::interval)
        AT TIME ZONE 'America/Sao_Paulo',
    8,
    CASE WHEN m.slug = 'gravity-kart' THEN 12000 ELSE 18000 END,
    'open'
FROM modalities m
CROSS JOIN generate_series(1, 7) AS d
CROSS JOIN (VALUES (10), (14), (16)) AS hours(h)
WHERE m.slug IN ('super-mountain-kart', 'gravity-kart');

-- +goose Down
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS availability_slots;
