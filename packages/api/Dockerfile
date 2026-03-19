FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb ./
COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

RUN --mount=type=secret,id=CI_JOB_TOKEN \
    printf '[install.scopes]\n"@imapps" = { url = "https://npm.pkg.github.com/", token = "%s" }\n' \
    "$(cat /run/secrets/CI_JOB_TOKEN)" > bunfig.toml

RUN bun install --frozen-lockfile

COPY . .

RUN bun --filter @jewellery-catalogue/api build

FROM oven/bun:1-alpine AS runner

WORKDIR /app

COPY --from=builder /app/packages/api/build ./build

EXPOSE 4001

CMD ["bun", "run", "build/index.js"]
