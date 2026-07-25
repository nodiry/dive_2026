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
BMC_MARKER="samples/2026_DIVE_해커톤_제공데이터_부산도시공사/매입임대주택 상세 정보 및 평균보증금, 평균임대료/매입임대 주택정보_20260630.csv"
if [ -f "$BMC_MARKER" ]; then
  echo "samples/ already present, skipping unzip"
elif [ -f samples.zip ]; then
  echo "unzipping samples.zip (may take a minute)..."
  unzip -q -o samples.zip -d samples
else
  echo "samples.zip not found at repo root — get it from a teammate and drop it here, then re-run this command." >&2
  exit 1
fi

# The pre-2026-06-30 layout kept renamed BMC CSVs in samples/housing/ —
# superseded by the official handout folder above, drop it if still around.
if [ -d samples/housing ]; then
  echo "removing superseded samples/housing/ (replaced by the 2026-06-30 BMC handout)"
  rm -rf samples/housing
fi

# The heavy 선도소프트 융합데이터 stays out of samples.zip. Teammates drop the
# handout zip at the repo root (Google Drive's "-20260725T…Z-1-001" suffix is
# fine, no rename needed) and this merges it into samples/. Drive zips store
# Korean names without the zip UTF-8 flag, which breaks plain `unzip`
# ("Illegal byte sequence") — scripts/kunzip.py repairs the names.
SUNDO_DIR="samples/2026_DIVE_해커톤_제공데이터_선도소프트"
SUNDO_MARKER="02. 인구-5대업종 가맹점 융합데이터"
# ASCII-only pattern on purpose: macOS stores the Korean part of the filename
# in decomposed unicode (NFD), so an NFC Korean glob silently never matches.
SUNDO_ZIP="$(find . -maxdepth 1 -name "2026_DIVE*.zip" -print -quit)"
if [ ! -d "$SUNDO_DIR/$SUNDO_MARKER" ] && [ -n "$SUNDO_ZIP" ]; then
  echo "unzipping $SUNDO_ZIP into $SUNDO_DIR/..."
  staging="$(mktemp -d)"
  python3 scripts/kunzip.py "$SUNDO_ZIP" "$staging"
  src="$staging"
  if [ ! -d "$src/$SUNDO_MARKER" ]; then
    # some exports nest everything under one top-level folder — find it
    inner="$(find "$staging" -maxdepth 3 -type d -name "02.*" -print -quit)"
    [ -n "$inner" ] && src="$(dirname "$inner")"
  fi
  mkdir -p "$SUNDO_DIR"
  cp -R "$src"/. "$SUNDO_DIR"/
  rm -rf "$staging"
fi
if [ ! -d "$SUNDO_DIR/$SUNDO_MARKER" ]; then
  echo "note: 선도소프트 융합데이터 not present — the population density layer will be"
  echo "      skipped during seeding. Drop 2026_DIVE_해커톤_제공데이터_선도소프트*.zip"
  echo "      at the repo root and re-run this command, or copy the handout's"
  echo "      01/02/03 folders into $SUNDO_DIR/ — see docs/DATA_MODEL.md Part 5."
fi

step "installing dependencies (client bun install + api venv)"
(cd client && bun install)
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

step "seeding the database (housing + POI + GIS + population when available)"
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
