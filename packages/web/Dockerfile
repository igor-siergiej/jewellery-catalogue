FROM node:22 AS builder

ARG VITE_API_URL
ARG VITE_AUTH_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

COPY packages/types/package.json packages/types/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json

RUN corepack enable && corepack prepare yarn@stable --activate

RUN yarn install --immutable 

COPY . .

RUN yarn workspace @jewellery-catalogue/web build

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
