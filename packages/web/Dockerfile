FROM oven/bun:1-alpine AS builder

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

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

RUN APP_VERSION="$APP_VERSION" bun --filter @jewellery-catalogue/web build

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
