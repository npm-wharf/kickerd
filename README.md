# kickerd

Source configuration from various inputs and kick the service when they change. Heavily inspired by confd.

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]

## Problem It Solves

Any sufficiently mature system I've worked on runs into a situation where the desire to supply service configuration from multiple sources comes into play. The primary issue is that they are generally:

  * difficult to reason about / predict
  * don't solve for changes to values in various configuration sources

## So Why Not Confd?

 * It's design is based around manging multiple services on a system
 * It errors when keys are missing from a back-end instead of falling back (as advertised)
 * It's watch-mode has serious CPU/Memory overhead problems which multiply when run per container
 * It appears to be abandonware :(

 For my use case, the first 3 generate a lot of additional work. I built a work around for the first, but the other two require me to maintain a separate fork of something that's not an ideal fit to begin with.

## What It Does

kickerd is an attempt to address this by providing a CLI/daemon that will:

 * manage a set of configuration inputs
 * bootstrap a single process with the resulting configuration
 * restart that process when a configuration value changes
 * establish a lock in etcd when restarting to limit restarts across instances
 * log _warnings_ if no key, environment variable or default exists rather than error and fail to host the process

## What It Doesn't Do

This does not provide a full fledged, open ended, choose your own adventure style template language. The TOML input this works with is very simple (as you'll see) and right now the only data back-end it even works with is etcd.

This is also not a process manager in the sense that it will keep your process running despite process crashes. **If the hosted process fails, kickerd will exit.** Something other than kickerd needs to ensure that your service survives crashes. Kickerd is not that.

## Goals

 * works well in/with containers
 * works for multi-environment, multi-instance solutions
 * hosted services shouldn't require code changes to work with kickerd

## Configuration Template

There are three top level properties:

 * `name`|`app` - (optional) the title of the process, will use the package.json `name` if omitted. When fetching keys
 kickerd first checks `${prefix}/${name}` prior to checking
 the global `${prefix}` configuration.
 * `description` - (optional) the description, will use the package.json `description` if omitted
 * `start` - how to start the process, will attempt to use package.json `start` script if available

It's worth noting that the `name` is also used when generating key prefixes for etcd (depending on how kickerd is called).

Blocks:

 * environment - assign environment variables to etcd keys
 * default - defaults to fall back to when no environment variable exists
 * argument - arguments to pass to the process when starting it

__Example: configuration.toml__
```shell
name = "test-app"
start = "node ./index.js"

[environment]
  TITLE = "{{site-title}}"
  PORT = "{{site-port}}"
  MOTD = "{{site-motd}}"
  ORG = "{{site-org}}"

[default]
  TITLE = "Demo"
  PORT = 8008
  MOTD = "Ohhai, it's a thing"

[argument]
  title = "TITLE"
  message-of-the-day = "MOTD"
```

 * When a key isn't available in the data source (etcd), then the environment variable's value will be used.
 * If the environment variable is empty, then a default value (if one was provided) will be used.
 * If no default variable was provided, then a warning will be logged to stdout before starting the service.
 * Arguments **must** map to environment variables

## CLI

By default, kickerd will look in the current directory for a `.kicker.toml`, if the configuration file has a different name, then you'll need to specify that as an argument.

```shell
kickerd
```

Argument list:

 * `--file` - default `.kicker.toml` - the configuration file to use
 * `--prefix` - provide an explicit etcd key prefix to use when
   fetching keys (defaults to `NODE_ENV`).
 * `--group` - allow an application to be run in a different
  config group, e.g., replica vs. primary.
 * `--lock-restart` - default `true` - limit instance restarts to one at a time using an etcd key for locking
 * `--lock-ttl` - default `5` - seconds the restart lock will stay in etcd (prevents deadlocks)
 * `--debug` - print out environment values - DO NOT DO THIS IN PROD, IT WILL TELL YOUR SECRETS TO THE LOG
 * `--bootstrap` - instead of hosting the process, create a bootstrap shell script that exports the environment
 * `--etcd` - the URL to use for etcd, default is `http://localhost:2379`

## Example with Docker Compose

I've provided an example application that demonstrates how to use kickerd in a docker image to get configuration from an etcd cluster.

__Starting The Example__
```shell
docker-compose build
docker-compose up
```

Navigate to `http://localhost:8018`.

__Clean up__
```shell
docker-compose down
```

The express app gets the process title, port and response content from etcd. Using whatever tool you're comfortable with, you can change any of the following keys and observe the changes:

 * `http/development/site-title`
 * `http/development/site-motd`
 * `http/development/site-port`

The goal of the example is to provide a simple working implementation that allows you to test ideas and also see what's involved in using it. The largest overhead is getting your own etcd cluster setup.

### containers

 * etcd
 * simple express app

## How To Bake Kickerd Into Your Own Docker Images

The docker image included in the example isn't super useful. There are three steps to using kickerd:

 1. a RUN step (or addition to an existing one) that installs kickerd as a global npm module
 1. creating a `.kicker.toml` file
 1. creating a start script for your docker image to call kickerd

### 1 - Installing Kickerd In Your Docker Image

Ideally, you'll do this for a _baseline_ image instead of doing it for your actual image. This keeps you from having to wait for a kickerd install every time you build your image during CI.

```RUN npm i kickerd -g```

### 2 - Creating a `.kicker.toml`

This file provides the mapping from etcd keys to the environment variables your service uses. It can also provide overrides for the name, description, and how to start your service as well as defaults for environment variables that might be missing keys or won't have keys.

This file should get picked up by the `ADD` directive in your service's `Dockerfile`, just be sure that if you have a `.dockerignore`, it doesn't have any directives that would exclude the file.

### 3 - Creating a Start Script

Last, you need a shell script that your Docker container will call in order to invoke kickerd and host your service.

If you want your service to restart on key changes, then having kickerd host your service is the way to go. It will monitor the namespace for your keys for additions, changes and deletions and restart the service when they occur.

By default, it will also orchestrate rolling restarts by locking on a special key in etcd so that all your instances don't restart at once on key changes.

__To Have kickerd Host__
```shell
#!/bin/sh
kickerd --etcd=http://etcd:2379
```

If this is a problem, you can always run kickerd in bootstrap mode. It will generate a shell script to start your service with the appropriate environment variables which you can then execute directly.

This does not provide a way for configuration changes to signal your service to restart. The assumption here is that you don't actually want or need that behavior and would prefer to forgo the overhead.

__To Generate A BootStrap Script__
```shell
#!/bin/sh
kickerd --etcd=http://etcd:2379 --bootstrap=true
./bootstrap.sh
```

## Setting Configuration

### Global Keys

When keys used between multiple services, e.g., shared AWS credentials, simply use the prefix of `${environment}/${key}`.

### App Specific Keys

To set config on an application specific basis, simply use
the prefix `${environment}/${key}.${app}`, where `app` is the name configured in `.kicker.toml`.

### Group Specific Keys

You can provide even finer grained config using a group, simply use
the prefix `${environment}/${key}.${app}.${group}`, where `group` represents a different category of application.

## Running Tests

You'll need a local running instance of etcd. The `start-etcd.sh` script will handle this for you if you're on a machine with docker running and don't require `sudo` to run the docker command.

## To Do

 * warn when no value was found for a key from etcd, environment or default
 * provide security (SSL, auth) options for etcd

[travis-url]: https://travis-ci.org/arobson/kickerd
[travis-image]: https://travis-ci.org/arobson/kickerd.svg?branch=master
[coveralls-url]: https://coveralls.io/github/arobson/kickerd?branch=master
[coveralls-image]: https://coveralls.io/repos/github/arobson/kickerd/badge.svg?branch=master
