const bole = require('bole')
const log = bole('kickerd')
const spawn = require('child_process').spawn
const parse = require('shell-quote').parse
const SIGTERM = 'SIGTERM'
const SIGINT = 'SIGINT'

function addSignalHandler (configuration) {
  if (!configuration.signalsHandled) {
    configuration.signalsHandled = true
    process.on(SIGTERM, onShutdown.bind(null, configuration))
    process.on(SIGINT, onShutdown.bind(null, configuration))
    process.on('exit', onShutdown.bind(null, configuration))
  }
}

function mapEnvironment (environment, configuration) {
  configuration.sets.forEach(set => {
    let value = set.value || set.default
    if (set.type === 'number') {
      environment[set.env] = parseInt(value)
    } else {
      environment[set.env] = value
    }
  })
}

function onError (error) {
  log.error(`Failed to start service with error: ${error.message}`)
  process.exit(100)
}

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

function restart (configuration, onExit) {
  log.info('Restarting service to pick up new configuration values')
  return stop(configuration)
    .then(
      () => start(configuration, onExit)
    )
}

function start (configuration, onExit) {
  addSignalHandler(configuration)
  const parts = parse(configuration.start)
  const environment = process.env
  mapEnvironment(environment, configuration)
  const child = spawn(
    parts[0],
    parts.slice(1),
    {
      cwd: configuration.cwd || process.cwd(),
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
    const deferred = {resolve: null, reject: null, promise: null}
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
