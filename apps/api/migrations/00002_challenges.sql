-- +goose Up
CREATE TABLE media_assets (
    id UUID PRIMARY KEY,
    owner_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    bucket_key TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT '',
    bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE arena_modalities (
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    modality_id UUID NOT NULL REFERENCES modalities(id) ON DELETE CASCADE,
    PRIMARY KEY (arena_id, modality_id)
);

INSERT INTO arena_modalities (arena_id, modality_id) VALUES
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201'),
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202')
ON CONFLICT DO NOTHING;

CREATE TABLE challenges (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    modality_id UUID NOT NULL REFERENCES modalities(id),
    arena_id UUID NOT NULL REFERENCES arenas(id),
    created_by UUID NOT NULL REFERENCES users(id),
    competition_type TEXT NOT NULL DEFAULT 'open',
    status TEXT NOT NULL DEFAULT 'draft',
    regulation TEXT NOT NULL DEFAULT '',
    capacity INT NOT NULL DEFAULT 8 CHECK (capacity > 0),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NULL,
    cover_asset_id UUID NULL REFERENCES media_assets(id) ON DELETE SET NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT challenges_status_check CHECK (
        status IN (
            'draft',
            'pending_approval',
            'published',
            'in_progress',
            'completed',
            'cancelled',
            'disputed'
        )
    ),
    CONSTRAINT challenges_competition_type_check CHECK (
        competition_type IN ('one_vs_one', 'team', 'individual', 'tournament', 'open')
    )
);

CREATE INDEX challenges_status_starts_at_idx ON challenges (status, starts_at);
CREATE INDEX challenges_modality_status_idx ON challenges (modality_id, status);
CREATE INDEX challenges_arena_starts_at_idx ON challenges (arena_id, starts_at);
CREATE INDEX challenges_created_by_idx ON challenges (created_by);

CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_name TEXT NULL,
    status TEXT NOT NULL DEFAULT 'invited',
    invited_by UUID NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (challenge_id, user_id),
    CONSTRAINT challenge_participants_status_check CHECK (
        status IN ('invited', 'confirmed', 'declined', 'cancelled', 'checked_in')
    )
);

CREATE INDEX challenge_participants_user_idx ON challenge_participants (user_id);

-- +goose Down
DROP TABLE IF EXISTS challenge_participants;
DROP TABLE IF EXISTS challenges;
DROP TABLE IF EXISTS arena_modalities;
DROP TABLE IF EXISTS media_assets;
