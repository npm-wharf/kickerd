# Contributing

## Testing

### Test set-up

Running the following commands should successfully run the tests:

```
# Install node packages
$ npm install
# grab the docker file
$ docker pull appcelerator/etcd:3.1.9
# start the etcd instance
$ ./start-etcd.sh
# install the example app node packages
$ cd example/app && npm i && cd ../../
# run the tests
$ npm run coverage
```

If the docker instance gets in to a weird state (`etcd` tests will fail) you may need to reset the docker vm:

```
# Running ./start-etcd.sh will fail because a docker image is already running:
$ ./start-etcd.sh
docker: Error response from daemon: Conflict. The container name "/kickerd-etcd" is already in use by container "6beeb116c20102e26307fb26731c25c32b5bcec2eddd5f82e0c52065fd4700e9". You have to remove (or rename) that container to be able to reuse that name.
See 'docker run --help'.
$ docker stop 6beeb116c20102e26307fb26731c25c32b5bcec2eddd5f82e0c52065fd4700e9
6beeb116c20102e26307fb26731c25c32b5bcec2eddd5f82e0c52065fd4700e9
$ docker rm 6beeb116c20102e26307fb26731c25c32b5bcec2eddd5f82e0c52065fd4700e9
6beeb116c20102e26307fb26731c25c32b5bcec2eddd5f82e0c52065fd4700e9
$ ./start-etcd.sh
# This should work!
```

If the HTTP server process gets in to a weird state (`process-host` tests will fail) you may need to manually kill the HTTP process:

```
$ ps
  PID TTY           TIME CMD
 1424 ttys001    0:00.08 -zsh
 1234 ttys001    0:09.23 http

$ kill -9 1234
```

### Running the tests

You can run the tests using the following command:

> npm run coverage

This runs the tests using `nyc`. Because the tests are presently a mix of integration and unit tests, there's some set-up required before you run the tests.
