-- +goose Up
ALTER TABLE media_assets
    ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'cover',
    ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';

ALTER TABLE media_assets
    DROP CONSTRAINT IF EXISTS media_assets_purpose_check;
ALTER TABLE media_assets
    ADD CONSTRAINT media_assets_purpose_check CHECK (
        purpose IN ('cover', 'avatar', 'live', 'gallery', 'other')
    );

ALTER TABLE media_assets
    DROP CONSTRAINT IF EXISTS media_assets_status_check;
ALTER TABLE media_assets
    ADD CONSTRAINT media_assets_status_check CHECK (
        status IN ('pending', 'ready', 'failed', 'deleted')
    );

CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    arena_id UUID NULL REFERENCES arenas(id) ON DELETE SET NULL,
    challenge_id UUID NULL REFERENCES challenges(id) ON DELETE SET NULL,
    cover_asset_id UUID NULL REFERENCES media_assets(id) ON DELETE SET NULL,
    stream_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'scheduled',
    starts_at TIMESTAMPTZ NULL,
    is_demo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT live_streams_status_check CHECK (
        status IN ('scheduled', 'live', 'ended', 'offline')
    )
);

CREATE INDEX IF NOT EXISTS live_streams_status_starts_idx ON live_streams (status, starts_at);

INSERT INTO live_streams (id, title, description, arena_id, stream_url, status, starts_at, is_demo)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'SMK Live — bateria da noite',
        'Transmissão demo da Super Mountain Kart. Stream real chega na Fase 5.',
        '11111111-1111-1111-1111-111111111111',
        '',
        'scheduled',
        now() + interval '2 days',
        TRUE
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        'Urban Circuit — highlights',
        'Hub de mídia da segunda arena. Placeholders até integração de live.',
        '11111111-1111-1111-1111-111111111112',
        '',
        'offline',
        NULL,
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- +goose Down
DELETE FROM live_streams WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);
DROP TABLE IF EXISTS live_streams;
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_purpose_check;
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_status_check;
ALTER TABLE media_assets DROP COLUMN IF EXISTS purpose;
ALTER TABLE media_assets DROP COLUMN IF EXISTS title;
ALTER TABLE media_assets DROP COLUMN IF EXISTS is_public;
ALTER TABLE media_assets DROP COLUMN IF EXISTS status;
