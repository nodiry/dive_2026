# Build context is the repo root (not client/) — client depends on the
# packages/shared bun workspace, so bun install needs the whole monorepo.
FROM oven/bun:1

WORKDIR /repo

COPY package.json bun.lock ./
COPY client/package.json client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

COPY packages/shared/ packages/shared/
COPY client/ client/

WORKDIR /repo/client

EXPOSE 5173

CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]
