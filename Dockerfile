FROM node:16-alpine3.11

WORKDIR /usr/xenon/src

COPY package.json /usr/xenon
RUN npm install -g npm@8.1.0
RUN npm -v
RUN npm install

ADD src /usr/xenon/src
COPY tsconfig.json /usr/xenon
COPY .eslintignore /usr/xenon
COPY .eslintrc /usr/xenon

RUN npm run lint
RUN npm run build

CMD [ "npm", "run", "start" ]
EXPOSE 8089