default:
	@just --list

onboard:
	bash scripts/onboard.sh

install:
	cd client && bun install
	cd api && uv sync --all-groups

up:
	docker compose up -d

down *args:
	docker compose down {{args}}

migrate:
	cd api && just migrate

seed:
	cd api && just seed

geocode:
	cd api && just geocode

api:
	cd api && just dev

client:
	cd client && bun run dev
