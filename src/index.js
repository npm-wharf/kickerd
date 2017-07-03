
const bootStrap = require('./bootstrap-template')
const configMapper = require('./config-mapper')
const etcdFn = require('./etcd')

function onError (configuration, error) {
  console.log(`Error retrieving keys for ${configuration.prefix} from etcd ${configuration.etcd}: ${error.message}`)
  process.exit(100)
}

function onKeys (configuration, keys) {
  configuration.sets.forEach(set => {
    const etcdValue = keys[set.key]
    if (etcdValue) {
      if (!set.type) {
        set.type = /['"A-Za-z:]/.test(etcdValue) ? 'string' : 'number'
      }
      set.value = etcdValue
    }
  })
  return configuration
}

// currently a noop, surprising no one
function hostProcess (configuration) {
  console.log('coming soon')
  process.exit(100)
}

function initProcess (configuration) {
  if (configuration.debug === true) {
    logConfiguration(configuration)
  }
  if (configuration.bootstrap) {
    writeBootStrap(configuration)
  } else {
    hostProcess(configuration)
  }
}

function kick (args) {
  const configuration = configMapper.load(args.file)
  Object.assign(configuration, args)
  const etcd = etcdFn({ url: configuration.etcd })
  etcd.fetchConfig(configuration)
    .then(
      keys => onKeys(configuration, keys),
      error => onError(configuration, error)
    )
    .then(initProcess)
}

function logConfiguration (configuration) {
  // lol, this needs improving
  console.log(configuration)
}

function writeBootStrap (context) {
  bootStrap.generate(context)
  console.log('bootstrap file generated successfully')
}

module.exports = kick
