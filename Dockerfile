FROM npmjs/npm-docker-baseline:6.10

RUN mkdir -p /src/kickerd && \
    mkdir -p /src/app

ADD . /src/kickerd
ADD ./example/app /src/app

RUN cd /src/kickerd && \
    npm i -g && \
    cd /src/app && \
    npm i

WORKDIR /src/app

EXPOSE 8008

CMD ./start.sh
