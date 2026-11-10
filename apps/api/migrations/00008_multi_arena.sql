-- +goose Up
INSERT INTO arenas (id, slug, name, description, address_json, timezone, is_published, capacity_default)
VALUES (
    '11111111-1111-1111-1111-111111111112',
    'dr-urban-circuit',
    'DR Urban Circuit',
    'Segunda DR Arena — circuito urbano compacto para desafios e experiências rápidas.',
    '{"city":"São Paulo","state":"SP","country":"BR"}'::jsonb,
    'America/Sao_Paulo',
    TRUE,
    24
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO arena_modalities (arena_id, modality_id) VALUES
    ('11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222201'),
    ('11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222202')
ON CONFLICT DO NOTHING;

INSERT INTO availability_slots (id, arena_id, modality_id, starts_at, ends_at, capacity, price_cents, status)
SELECT
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111112',
    m.id,
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + (d || ' days')::interval + (h || ' hours')::interval)
        AT TIME ZONE 'America/Sao_Paulo',
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + (d || ' days')::interval + ((h + 1) || ' hours')::interval)
        AT TIME ZONE 'America/Sao_Paulo',
    6,
    CASE WHEN m.slug = 'gravity-kart' THEN 9000 ELSE 15000 END,
    'open'
FROM modalities m
CROSS JOIN generate_series(1, 5) AS d
CROSS JOIN (VALUES (11), (15), (18)) AS hours(h)
WHERE m.slug IN ('super-mountain-kart', 'gravity-kart');

-- +goose Down
DELETE FROM availability_slots WHERE arena_id = '11111111-1111-1111-1111-111111111112';
DELETE FROM arena_modalities WHERE arena_id = '11111111-1111-1111-1111-111111111112';
DELETE FROM arenas WHERE id = '11111111-1111-1111-1111-111111111112';
