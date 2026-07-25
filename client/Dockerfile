FROM oven/bun:1

WORKDIR /repo/client

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

COPY . .

EXPOSE 5173

CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]
