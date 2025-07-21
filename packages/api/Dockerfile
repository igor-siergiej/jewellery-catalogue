FROM node:22-slim AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/auth/package.json packages/auth/package.json

RUN corepack enable && corepack prepare yarn@stable --activate

RUN yarn install --immutable

COPY . .

RUN yarn workspace @jewellery-catalogue/api build

FROM node:22-alpine AS runner

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable && corepack prepare yarn@stable --activate

COPY packages/api/package.json packages/api/package.json

RUN yarn workspaces focus @jewellery-catalogue/api --production

COPY --from=builder /app/packages/api/build ./build

EXPOSE 4001

CMD ["node", "build/index.js"]
