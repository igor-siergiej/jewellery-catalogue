FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY .yarnrc.yml ./.yarnrc.yml

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ENV YARN_NODE_LINKER=node-modules

RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Configure GitLab Package Registry authentication
RUN --mount=type=secret,id=CI_JOB_TOKEN \
    CI_JOB_TOKEN=$(cat /run/secrets/CI_JOB_TOKEN) && \
    yarn config set npmScopes.imapps.npmRegistryServer "https://gitlab.com/api/v4/projects/116310254/packages/npm/" && \
    yarn config set npmScopes.imapps.npmAuthToken "$CI_JOB_TOKEN"

RUN yarn install --immutable

COPY . .

RUN yarn install --immutable

RUN yarn workspace @jewellery-catalogue/api build

FROM node:22-alpine AS runner

WORKDIR /app

# Copy package files and build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json
COPY --from=builder /app/packages/api/build ./build

ENV YARN_NODE_LINKER=node-modules

RUN corepack enable && corepack prepare yarn@4.9.2 --activate && \
    yarn workspaces focus @jewellery-catalogue/api --production

EXPOSE 4001

CMD ["node", "build/index.js"]
