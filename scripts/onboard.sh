#!/usr/bin/env bash
# The whole onboarding flow for a new teammate: git clone, bun install,
# bun run onboard. That's it — this script does the rest.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { echo; echo "==> $1"; }

step "checking env files"
[ -f api/.env ] || { cp api/.env.example api/.env; echo "created api/.env (add KAKAO_REST_API_KEY when you have it)"; }
[ -f client/.env ] || { cp client/.env.example client/.env; echo "created client/.env (add VITE_KAKAO_MAP_KEY when you have it)"; }

step "checking sample data"
if [ -f samples/housing/purchased_units.csv ]; then
  echo "samples/ already present, skipping unzip"
elif [ -f samples.zip ]; then
  echo "unzipping samples.zip (~560MB, may take a minute)..."
  unzip -q -o samples.zip -d samples
else
  echo "samples.zip not found at repo root — get it from a teammate and drop it here, then re-run this command." >&2
  exit 1
fi

step "starting docker services (db, api, client)"
docker compose up -d --build

step "waiting for the api container to be ready"
for i in $(seq 1 30); do
  docker compose exec -T api true >/dev/null 2>&1 && break
  sleep 2
done

step "running migrations"
# Postgres's own init sequence briefly restarts even after pg_isready reports
# healthy (temp startup for initdb scripts -> shutdown -> real startup) —
# a connection attempt landing in that gap gets ECONNREFUSED. Retry.
for i in $(seq 1 10); do
  docker compose exec -T api python -m app.scripts.migrate && break
  echo "migration attempt $i failed, retrying in 3s..."
  sleep 3
  if [ "$i" -eq 10 ]; then
    echo "migrations failed after 10 attempts — check 'docker compose logs db'" >&2
    exit 1
  fi
done

step "seeding the database (housing + POI + GIS layers, ~80s)"
docker compose exec -T api python -m app.scripts.seed

echo
echo "done."
echo "  api:    http://localhost:3000"
echo "  client: http://localhost:5173"
echo
echo "Map and live geocoding need Kakao keys in api/.env and client/.env —"
echo "see README.md. Once added: docker compose up -d --build, then"
echo "docker compose exec api python -m app.scripts.geocode_housing"
