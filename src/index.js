
const bootStrap = require('./bootstrap-template')
const configMapper = require('./config-mapper')
const etcdFn = require('./etcd')
const processHost = require('./process-host')
const RETRY_TIMEOUT = 5

function configurationChanged (configuration, etcd, change) {
  console.log(`Configuration change detected ${change.node.key}`)
  if (configuration.lockRestart) {
    const lock = etcd.lockRestart(configuration)
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
  console.log(`Error retrieving keys for ${configuration.prefix} from etcd ${configuration.etcd}: ${error.message}`)
  process.exit(100)
}

function onLock (configuration, lock) {
  return process.host.restart(configuration, onExit)
    .then(
      () => lock.unlock()
    )
}

function onLockFailed (configuration, etcd, change, err) {
  const retry = configuration.lockTTL || RETRY_TIMEOUT
  console.log(`Failed to acquire lock, trying again in ${retry} seconds : ${err}`)
  setTimeout(() => configurationChanged(configuration, etcd, change), retry)
}

function hostProcess (configuration, etcd) {
  processHost.start(configuration, onExit)
  etcd.watch(configuration, (change) => {
    configurationChanged(configuration, etcd, change)
  })
}

function initProcess (configuration, etcd) {
  if (configuration.debug === true) {
    logConfiguration(configuration)
  }
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
  etcd.fetchConfig(configuration)
    .then(
      () => initProcess(configuration, etcd),
      error => onError(configuration, error)
    )
}

function logConfiguration (configuration) {
  // lol, this needs improving
  console.log(configuration)
}

function onExit () {
  process.exit(100)
}

function writeBootStrap (context) {
  bootStrap.generate(context)
  console.log('bootstrap file generated successfully')
}

module.exports = kick
