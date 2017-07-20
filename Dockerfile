# Set the base image to alpine Node LTS
FROM node:6-alpine

# File Author / Maintainer
MAINTAINER Alex Robson <alexr@npmjs.com>

RUN apk update
RUN apk add curl nano python make g++ git
RUN npm i node-gyp kickerd@latest -g --unsafe

RUN mkdir -p /app/src
WORKDIR /app/src
COPY ./kick.sh /app/src

CMD ./kick.sh
