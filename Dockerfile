FROM node:16-alpine

ENV DOCKER=true

WORKDIR /app

COPY package.json yarn.lock .pnp.cjs .pnp.loader.mjs ./
COPY .yarn .yarn

RUN yarn

COPY . .

RUN yarn build

CMD [ "yarn", "start" ]
