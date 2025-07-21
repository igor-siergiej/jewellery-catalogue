FROM node:22-slim AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/types/package.json packages/types/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/api/package.json packages/api/package.json

RUN corepack enable && corepack prepare yarn@stable --activate

RUN yarn install --immutable

COPY packages/auth ./packages/auth
COPY packages/types ./packages/types

RUN yarn workspace @jewellery-catalogue/auth build

FROM node:22-alpine AS runner

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable && corepack prepare yarn@stable --activate

COPY packages/auth/package.json packages/auth/package.json

RUN yarn workspaces focus @jewellery-catalogue/auth --production

COPY --from=builder /app/packages/auth/build ./build

EXPOSE 3008

CMD ["node", "build/index.js"]