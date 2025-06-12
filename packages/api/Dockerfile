FROM node:22

WORKDIR /app

COPY package.json yarn.lock ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

RUN yarn install 

COPY . .

RUN yarn workspace @jewellery-catalogue/types build

RUN yarn workspace @jewellery-catalogue/api build

RUN yarn install

EXPOSE 4001
CMD ["node", "/app/packages/api/build/index.js"]

