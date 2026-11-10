-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'active',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    username CITEXT NOT NULL UNIQUE,
    bio TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    avatar_asset_id UUID NULL,
    birthdate DATE NULL,
    parental_consent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID NULL REFERENCES users(id),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    user_agent TEXT NULL,
    ip TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feature_flags (
    key TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID NULL REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE modalities (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    scoring_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE arenas (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    capacity_default INT NOT NULL DEFAULT 0,
    logo_asset_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO feature_flags (key, enabled, metadata)
VALUES ('payments.p2p_prizes', FALSE, '{"note":"disabled until legal approval"}'::jsonb);

INSERT INTO arenas (id, slug, name, description, is_published, capacity_default)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'super-mountain-kart',
    'Super Mountain Kart',
    'Primeira DR Arena — circuito e experiências presenciais.',
    TRUE,
    40
);

INSERT INTO modalities (id, slug, name, description, is_active, sort_order, scoring_config) VALUES
(
    '22222222-2222-2222-2222-222222222201',
    'super-mountain-kart',
    'Super Mountain Kart',
    'Karts elétricos em circuito de montanha.',
    TRUE,
    1,
    '{"win":25,"podium":10,"participation":3}'::jsonb
),
(
    '22222222-2222-2222-2222-222222222202',
    'gravity-kart',
    'Gravity Kart',
    'Descidas sem propulsão própria.',
    TRUE,
    2,
    '{"win":25,"podium":10,"participation":3}'::jsonb
);

-- +goose Down
DROP TABLE IF EXISTS modalities;
DROP TABLE IF EXISTS arenas;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS feature_flags;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;
