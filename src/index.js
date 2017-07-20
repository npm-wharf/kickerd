const bole = require('bole')
const log = bole('kickerd')
const bootStrap = require('./bootstrap-template')
const configMapper = require('./config-mapper')
const etcdFn = require('./etcd')
const processHost = require('./process-host')
const RETRY_TIMEOUT = 5

function configurationChanged (configuration, etcd, change) {
  if (change.action === 'ignore') {
    return
  }
  log.info(`Configuration change detected ${change.node.key}`)
  if (configuration.lockRestart) {
    const lock = etcd.lockRestart(configuration)
    log.info('Acquiring restart lock')
    lock.lock()
      .then(
        () => onLock(configuration, lock),
        onLockFailed.bind(null, configuration, etcd, change)
      )
  } else {
    processHost.restart(configuration, onExit)
  }
}

function onError (configuration, error) {
  log.error(`Error retrieving keys for ${configuration.prefix} from etcd ${configuration.etcd}: ${error.message}`)
  process.exit(100)
}

function onLock (configuration, lock) {
  log.info('Restart lock acquired successfully')
  logConfiguration(configuration)
  return processHost.restart(configuration, onExit)
    .then(
      () => lock.unlock()
    )
}

function onLockFailed (configuration, etcd, change, err) {
  const retry = configuration.lockTTL || RETRY_TIMEOUT
  log.error(`Failed to acquire lock, trying again in ${retry} seconds : ${err}`)
  setTimeout(() => configurationChanged(configuration, etcd, change), retry)
}

function hostProcess (configuration, etcd) {
  log.info('Starting service')
  processHost.start(configuration, onExit)
  etcd.watch(configuration, (change) => {
    configurationChanged(configuration, etcd, change)
  })
}

function initProcess (configuration, etcd) {
  logConfiguration(configuration)
  if (configuration.bootstrap) {
    writeBootStrap(configuration)
  } else {
    hostProcess(configuration, etcd)
  }
}

function kick (args) {
  const configuration = configMapper.load(args.file)
  Object.assign(configuration, args)
  const etcd = etcdFn({ url: configuration.etcd })
  log.info('Fetching configuration from etcd')
  etcd.fetchConfig(configuration)
    .then(
      () => initProcess(configuration, etcd),
      error => onError(configuration, error)
    )
}

function logConfiguration (configuration) {
  log.debug('Configuration (application state)')
  log.debug(configuration)
}

function onExit () {
  log.info('Hosted service quit unexpectedly - exiting')
  process.exit(100)
}

function writeBootStrap (context) {
  bootStrap.generate(context)
  log.info('bootstrap file generated successfully')
}

module.exports = kick
