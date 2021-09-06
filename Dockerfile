FROM node:16-alpine3.11

WORKDIR /usr/nhb/src

COPY package.json /usr/nhb
RUN npm install

ADD src /usr/nhb/src
COPY tsconfig.json /usr/nhb
COPY .eslintignore /usr/nhb
COPY .eslintrc /usr/nhb
COPY .env.prod /usr/nhb/.env

RUN npm run lint
RUN npm run build

CMD [ "npm", "run", "start" ]
EXPOSE 8089