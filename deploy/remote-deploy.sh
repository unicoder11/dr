#!/bin/sh
set -eu
cd /opt/dr
find bin migrations -name '._*' -delete
chmod 755 bin/api bin/migrate
docker compose build dr-api
# Container entrypoint runs /app/migrate then the API.
docker compose up -d --no-deps --force-recreate dr-api

ok=0
i=0
while [ "$i" -lt 15 ]; do
  if body=$(curl -fsS -H 'Host: 177.93.129.153' http://127.0.0.1/readyz) && printf '%s' "$body" | grep -q '"ready"'; then
    printf '%s\n' "$body"
    ok=1
    break
  fi
  i=$((i + 1))
  sleep 2
done

if [ "$ok" != 1 ]; then
  echo "api did not become ready" >&2
  docker compose logs --tail 100 dr-api >&2 || true
  exit 1
fi
