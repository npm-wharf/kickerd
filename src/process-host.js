const bole = require('bole')
const log = bole('kickerd')
const spawn = require('child_process').spawn
const parse = require('shell-quote').parse
const SIGTERM = 'SIGTERM'
const SIGINT = 'SIGINT'

function addSignalHandler (configuration) {
  if (!configuration.signalsHandled) {
    configuration.signalsHandled = true
    process.on(SIGTERM, onShutdown.bind(null, configuration, 0))
    process.on(SIGINT, onShutdown.bind(null, configuration, 0))
    process.on('exit', onShutdown.bind(null, configuration, 0))
  }
}

function getArguments (configuration) {
  return configuration.sets.reduce((args, definition) => {
    if (definition.argument) {
      args.push(`--${definition.argument}=${definition.value}`)
    }
    return args
  }, [])
}

function mapEnvironment (environment, configuration) {
  configuration.sets.forEach(definition => {
    if (definition.type === 'number') {
      environment[definition.env] = parseInt(definition.value)
    } else if (definition.value === undefined) {
      environment[definition.env] = ''
    } else {
      environment[definition.env] = definition.value
    }
  })
}

function onError (error) {
  log.error(`Failed to start service with error: ${error.message}`)
  process.exit(100)
}

// When we shut down during testing, all hell breaks loose
// it runs this code but never gets to the .then() I believe
// because mocha terminates the process before the promise is resolved
/* istanbul ignore next */
function onShutdown (configuration, exitCode) {
  removeShutdownHandler()
  stop(configuration)
    .then(() => process.exit(exitCode))
}

function removeShutdownHandler () {
  process.removeAllListeners(SIGINT, onShutdown)
  process.removeAllListeners(SIGTERM, onShutdown)
  process.removeAllListeners('exit', onShutdown)
}

function restart (configuration, beforeStart, onExit) {
  log.info('Restarting service to pick up new configuration values')
  return stop(configuration)
    .then(() => { return beforeStart() })
    .then(
      () => start(configuration, onExit)
    )
}

function start (configuration, onExit) {
  addSignalHandler(configuration)
  const parts = parse(configuration.start)
  const argList = getArguments(configuration)
  const environment = process.env
  mapEnvironment(environment, configuration)
  const child = spawn(
    parts[0],
    parts.slice(1).concat(argList),
    {
      // NYC falsly complains that this if isn't triggered during tests even though it is
      // ignoring for the time being.
      cwd: /* istanbul ignore next */ configuration.cwd || process.cwd(),
      env: environment,
      stdio: configuration.stdio || 'pipe'
    }
  )
  child.on('error', onError)
  child.on('close', () => {
    if (configuration.waiting) {
      configuration.waiting.resolve()
    } else {
      onExit()
    }
  })
  configuration.process = child
}

function stop (configuration) {
  if (configuration.process && !configuration.waiting) {
    const deferred = { resolve: null, reject: null, promise: null }
    configuration.waiting = deferred
    deferred.promise = new Promise((resolve) => {
      deferred.resolve = () => {
        delete configuration.waiting
        resolve()
      }
      configuration.process.kill(SIGTERM)
    })
    return deferred.promise
  } else {
    return configuration.waiting.promise
  }
}

module.exports = {
  restart: restart,
  start: start,
  stop: stop
}
