FROM node:22

WORKDIR /app

COPY package.json yarn.lock ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

RUN yarn install 

COPY . .

# Build types package for production
RUN yarn workspace @jewellery-catalogue/types build

# Build API package  
RUN yarn workspace @jewellery-catalogue/api build

RUN yarn install --production

EXPOSE 4001
CMD ["node", "/app/packages/api/build/index.js"]

