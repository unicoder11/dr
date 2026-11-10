-- +goose Up
CREATE TABLE challenge_views (
    id UUID PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    viewer_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    viewer_key TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX challenge_views_challenge_created_idx ON challenge_views (challenge_id, created_at DESC);
CREATE INDEX challenge_views_creator_day_idx ON challenge_views (challenge_id, created_at);

-- Dedup soft: same viewer_key on same challenge within short window handled in app.
CREATE INDEX challenge_views_dedup_idx ON challenge_views (challenge_id, viewer_key, created_at DESC);

CREATE TABLE share_events (
    id UUID PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'link',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX share_events_challenge_idx ON share_events (challenge_id, created_at DESC);

INSERT INTO achievements (id, slug, name, description, icon) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'champion', 'Campeão', 'Venceu um desafio validado.', 'trophy'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'popular', 'Popular', 'Alcançou 5 seguidores.', 'star'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7', 'magnet', 'Ímã', 'Indicou 3 cadastros.', 'magnet'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8', 'viral', 'Viral', 'Um desafio passou de 10 visualizações.', 'flame'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9', 'host', 'Anfitrião', 'Publicou 3 desafios.', 'home')
ON CONFLICT (slug) DO NOTHING;

-- +goose Down
DELETE FROM achievements WHERE slug IN ('champion','popular','magnet','viral','host');
DROP TABLE IF EXISTS share_events;
DROP TABLE IF EXISTS challenge_views;
