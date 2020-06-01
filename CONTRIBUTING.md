# Contributing
## Table of Contents

* [Introduction](#introduction)
* [Code Structure](#code-structure)
* [Running Tests](#running-tests)
* [Coverage](#coverage)
* [Types of Contributions](#types-of-contributions)
  * [Contributing an Issue?](#contributing-an-issue)
  * [Contributing a Question?](#contributing-a-question)
  * [Contributing a Bug Fix?](#contributing-a-bug-fix)
  * [Contributing a Feature?](#contributing-a-feature)
* [Development Dependencies](#development-dependencies)
* [Dependencies](#dependencies)

## Introduction

Welcome to the kickerd Contributor Guide! This document outlines the kickerd's process for community interaction and contribution. This includes the issue tracker, pull requests, wiki pages, and, to a certain extent, outside communication in the context of the kickerd. This is an entry point for anyone wishing to contribute their time and effort to making kickerd a better tool for the JavaScript community!

All interactions in the kickerd repository are covered by the [npm Code of Conduct](https://www.npmjs.com/policies/conduct)


## Code Structure

```
/
├── bin/
│   │                  # operational JavaScript lives here
│   │
│   └── kickerd.js            # Code to pick up command-line arguments and pass 
|                             # them along to `kickerd`
│
├── example/app/
│                      # Directory that contains a test app for this
│                      # project.
│
├── spec/  🧪
│                      # All the tests and test assets for kickerd live in this
|                      # folder.
|
├── src/  📦
│                      # All the Good Bits(tm) of kickerd live here
│
├── CHANGELOG.md           # What's changed and when
├── CODE_OF_CONDUCT.md     # Details of our code of conduct
├── CONTRIBUTING.md        # This file! 🎉
├── docker-compose.yml     # Yaml file for docker compose
├── Dockerfile             # Docker goodness
├── kick.sh                # bash script to run kickerd command using env variables
├── kill-etcd.sh           # bash script to kill etcd if it's got in a bad state
├── LICENSE                # No Open Source project is complete without a License!
├── package.json           # The project's main manifest file 📃
├── README.md              # Read me :-)
└── start-etcd.sh          # bash script to start the etcd service
```

## Running Tests

Running the following commands should successfully run the tests:

```shell-script
# Install node packages
$ npm install
# grab the docker file
$ docker pull appcelerator/etcd:3.1.9
# start the etcd instance
$ ./start-etcd.sh
# install the example app node packages
$ cd example/app && npm i && cd ../../
# run the tests
$ npm test
```

If the docker instance gets in to a weird state (`etcd` tests will fail) you may need to reset the docker vm:

```shell-script
# Running ./start-etcd.sh will fail because a docker image is already running:
$ ./start-etcd.sh
docker: Error response from daemon: Conflict. The container name "/kickerd-etcd" is already in use by container "6beeb116c20102e26307fb26731c25c32b5bcec2eddd5f82e0c52065fd4700e9". You have to remove (or rename) that container to be able to reuse that name.
See 'docker run --help'.
$ ./kill-etcd.sh
$ ./start-etcd.sh
# This should work!
```

If the HTTP server process gets in to a weird state (`process-host` tests will fail) you may need to manually kill the HTTP process:

```shell-script
$ ps
  PID TTY           TIME CMD
 1424 ttys001    0:00.08 -zsh
 1234 ttys001    0:09.23 http

$ kill -9 1234
```

## Coverage

We try and make sure that each new feature or bug fix has tests to go along with them in order to keep code coverages consistent and increasing. We are actively striving for 100% code coverage!

```
# You can run the following command to find out coverage
$ npm run coverage
```

## Types of Contributions

> Before contributing something, double check the issue you're creating doesn't already exist in the repository but doing a quick search. Search of the [current issues](https://github.com/npm-wharf/kickerd/issues).

### Contributing a Question?

Huh? 🤔 Got a situation you're not sure about?! Perfect!

You can create a new question [here](https://github.com/npm-wharf/kickerd/issues/new?template=question.md&title=%5BQUESTION%5D+%3Ctitle%3E)!

### Contributing a Bug Fix?

We'd be happy to triage and help! Head over to the issues and [create a new one](https://github.com/npm-wharf/kickerd/issues/new?template=bug.md&title=%5BBUG%5D+%3Ctitle%3E)!


### Contributing a Feature?

Snazzy, we're always up for fancy new things! If the feature is fairly minor [create a new one](https://github.com/npm-wharf/kickerd/issues/new?template=feature.md&title=%5BFEATURE%5D+%3Ctitle%3E), and the team can triage it and prioritize it into our backlog. However, if the feature is a little more complex, then it's best to create an [RFC](https://en.wikipedia.org/wiki/Request_for_Comments) in our [RFC repository](https://github.com/npm/rfcs). Exactly how to do that is outlined in that repository. If you're not sure _exactly_ how to implement your idea, or don't want to make a document about your idea, then please create an issue on that repository. We consider these RRFC's, or a "Requesting Request For Comment".

## Development Dependencies

You'll need a few things installed in order to update and test kickerd during development:

* [node](https://nodejs.org/) v12

> We recommend that you have a [node version manager](https://github.com/nvm-sh/nvm) installed if you plan on fixing bugs that might be present in a specific version of node. With a version manager you can easily switch versions of node and test if your changes to the CLI project are working.

* [git](https://git-scm.com/) v2.11+
