# kickerd

Source configuration from various inputs and kick the service when they change. Heavily inspired by confd.

## Problem

Any sufficiently mature system I've worked on runs into a situation where the desire to supply service configuration from multiple sources comes into play. The primary issue is that they are generally:

  * difficult to reason about / predict
  * don't solve for changes to values in various configuration sources

## So Why Not Confd?

 * It's design is based around manging multiple services on a system
 * It errors when keys are missing from a back-end instead of falling back (as advertised)
 * It's watch-mode has serious CPU/Memory overhead problems which multiply when run per container
 * It appears to be abandonware :(

 For my use case, the first 3 generate a lot of additional work. I built a work around for the first, but the other two require me to maintain a separate fork of something that's not an ideal fit to begin with.

## What Will Do

kickerd is an attempt to address this by providing a CLI/daemon that will:

 * manage a set of configuration inputs
 * bootstrap a single process with the resulting configuration
 * restart that process when a configuration value changes
 * log _warnings_ if no key, environment variable or default exists rather than error and fail to host the process

## What Won't Do

This does not provide a full fledged, open ended, choose your own adventure style template language. The TOML input this works with is very simple (as you'll see) and right now the only data back-end it even works with is etcd.

## Goals

 * works well in/with containers
 * service source code doesn't require a change to work with kickerd

## Configuration Template

There are three top level properties:

 * `name` - (optional) the title of the process, will use the package.json `name` if omitted
 * `description` - (optional) the description, will use the package.json `description` if omitted
 * `start` - how to start the process, will attempt to use package.json `start` script if available

It's worth noting that the `name` is also used when generating key prefixes for etcd (depending on how kickerd is called).

Blocks:

 * environment - assign environment variables to etcd keys
 * default - defaults to fall back to when no environment variable exists

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
```

 * When a key isn't available in the data source (etcd), then the environment variable's value will be used. 
 * If the environment variable is empty, then a default value (if one was provided) will be used.
 * If no default variable was provided, then a warning will be logged to stdout before starting the service.

## CLI

By default, kickerd will look in the current directory for a `.kicker.toml`, if the configuration file has a different name, then you'll need to specify that as an argument.

```shell
kickerd
```

Argument list:

 * `--file` - default `.kicker.toml` - the configuration file to use
 * `--environment` - default `production` the environment prefix to use with the name to create etcd key prefix
 * `--prefix` - provide an explicit etcd key prefix for all keys
 * `--debug` - print out environment values - DO NOT DO THIS IN PROD, IT WILL TELL YOUR SECRETS TO THE LOG
 * `--bootstrap` - instead of hosting the process, create a bootstrap shell script that exports the environment
 * `--etcd` - the URL to use for etcd, default is `http://localhost:2379`

## To Do

 * get the daemon/host command to work that reloads the process on configuration change

