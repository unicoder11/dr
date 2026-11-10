-- +goose Up
CREATE TABLE results (
    id UUID PRIMARY KEY,
    challenge_id UUID NOT NULL UNIQUE REFERENCES challenges(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    validated_by UUID NULL REFERENCES users(id),
    validated_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT results_status_check CHECK (status IN ('draft', 'validated', 'disputed'))
);

CREATE TABLE ranking_entries (
    id UUID PRIMARY KEY,
    modality_id UUID NULL REFERENCES modalities(id) ON DELETE CASCADE,
    season TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    participations INT NOT NULL DEFAULT 0,
    rank_position INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ranking_entries_modality_season_user_uidx
    ON ranking_entries (modality_id, season, user_id)
    WHERE modality_id IS NOT NULL;

CREATE UNIQUE INDEX ranking_entries_general_season_user_uidx
    ON ranking_entries (season, user_id)
    WHERE modality_id IS NULL;

CREATE INDEX ranking_entries_modality_season_points_idx
    ON ranking_entries (modality_id, season, points DESC);

-- +goose Down
DROP TABLE IF EXISTS ranking_entries;
DROP TABLE IF EXISTS results;
