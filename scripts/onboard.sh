#!/usr/bin/env bash
# The whole onboarding flow for a new teammate: git clone, just onboard.
# That's it — this script does the rest.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { echo; echo "==> $1"; }

step "checking host prerequisites"
command -v docker >/dev/null || { echo "docker is required: https://docs.docker.com/get-docker/" >&2; exit 1; }
command -v bun >/dev/null || { echo "bun is required: https://bun.sh" >&2; exit 1; }
command -v uv >/dev/null || { echo "uv is required: https://docs.astral.sh/uv/" >&2; exit 1; }
command -v just >/dev/null || { echo "just is required: brew install just" >&2; exit 1; }
command -v ogr2ogr >/dev/null || { echo "GDAL is required for seeding: brew install gdal" >&2; exit 1; }

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

step "installing dependencies (bun workspaces + api venv)"
bun install
(cd api && uv sync --all-groups)

step "starting docker services (db, api, client)"
docker compose up -d

step "waiting for the database to accept connections"
# Postgres's own init sequence briefly restarts even after pg_isready reports
# healthy (temp startup for initdb scripts -> shutdown -> real startup) —
# a connection attempt landing in that gap gets ECONNREFUSED. Retry.
for i in $(seq 1 10); do
  (cd api && just migrate) && break
  echo "migration attempt $i failed, retrying in 3s..."
  sleep 3
  if [ "$i" -eq 10 ]; then
    echo "migrations failed after 10 attempts — check 'docker compose logs db'" >&2
    exit 1
  fi
done

step "seeding the database (housing + POI + GIS layers)"
(cd api && just seed)

step "geocoding housing addresses (needs KAKAO_REST_API_KEY in api/.env)"
if grep -qE '^KAKAO_REST_API_KEY=.+' api/.env 2>/dev/null; then
  (cd api && just geocode)
else
  echo "no KAKAO_REST_API_KEY set in api/.env — skipping."
  echo "the app still works (search/detail/recommend), but the map and"
  echo "lifestyle recommendations need geocoded coordinates. Add both Kakao"
  echo "keys (api/.env + client/.env, see README.md), then run: just geocode"
fi

echo
echo "voila. everything is up and seeded:"
echo "  api:    http://localhost:3000"
echo "  client: http://localhost:5173"
