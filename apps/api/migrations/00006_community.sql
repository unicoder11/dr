-- +goose Up
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX follows_following_idx ON follows (following_id);

CREATE TABLE referral_codes (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral_attributions (
    id UUID PRIMARY KEY,
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX referral_attributions_referrer_idx ON referral_attributions (referrer_user_id);

CREATE TABLE achievements (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'medal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_achievements (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, achievement_id)
);

INSERT INTO achievements (id, slug, name, description, icon) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'first-steps', 'Primeiros passos', 'Criou a conta na DESAFIOS REAIS.', 'flag'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'challenger', 'Desafiante', 'Publicou ou participou do primeiro desafio.', 'bolt'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'social', 'Comunidade', 'Seguiu alguém ou ganhou um seguidor.', 'users'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'recruiter', 'Recrutador', 'Indicou um amigo que se cadastrou.', 'share');

-- +goose Down
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS referral_attributions;
DROP TABLE IF EXISTS referral_codes;
DROP TABLE IF EXISTS follows;
