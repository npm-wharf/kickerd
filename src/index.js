
const bootStrap = require('./bootstrap-template')
const configMapper = require('./config-mapper')
const etcdFn = require('./etcd')
const processHost = require('./process-host')

function configurationChanged (configuration, change) {
  console.log(`Configuration change detected ${change.node.key}`)
  processHost.restart(configuration, onExit)
}

function onError (configuration, error) {
  console.log(`Error retrieving keys for ${configuration.prefix} from etcd ${configuration.etcd}: ${error.message}`)
  process.exit(100)
}

function hostProcess (configuration, etcd) {
  processHost.start(configuration, onExit)
  etcd.watch(configuration, (change) => {
    configurationChanged(configuration, change)
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
