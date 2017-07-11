const Promise = require('bluebird')
const Etcd = require('node-etcd')
const Lock = require('etcd-lock')
const DEFAULT_URL = 'http://localhost:2379'
const LOCK_ID = 'kickerd'
const LOCK_TTL = 5

function applyChange (config, change) {
  let match = false
  const key = getKey(config.prefix, change.node.key)
  const value = change.node.value
  config.sets.forEach(set => {
    if (set.key === key) {
      if (change.action === 'set') {
        set.value = value
      } else if (change.action === 'delete') {
        delete set.value
      }
      match = true
    }
  })
  if (!match && change.action === 'set') {
    config.sets.push({
      key: key,
      value: value,
      type: /['"A-Za-z]/.test(value) ? 'string' : 'number'
    })
  }
}

function applyKeys (config, keys) {
  config.sets.forEach(set => {
    const etcdValue = keys[set.key]
    if (etcdValue) {
      if (!set.type) {
        set.type = /['"A-Za-z:]/.test(etcdValue) ? 'string' : 'number'
      }
      set.value = etcdValue
    }
  })
  return config
}

function fetchConfig (client, config) {
  const get = Promise.promisify(client.get, {context: client})
  return get(config.prefix)
    .catch({ errorCode: 100 }, () => {
      // 'Key not found' error.
      return {node: {
        nodes: []
      }}
    })
    .then((reponse) => {
      return reponse.node.nodes.reduce((acc, node) => {
        const key = getKey(config.prefix, node.key)
        const splitKey = key.split('.')
        // as with the service etcetera (https://github.com/npm/etcetera),
        // we accept keys in the format key.app.group.
        if (splitKey[2] === config.group) {
          acc[splitKey[0]] = node.value
        } else if (splitKey[1] === config.name && splitKey[2] === undefined) {
          acc[splitKey[0]] = node.value
        } else if (!acc[key] && splitKey[1] === undefined) {
          acc[key] = node.value
        }
        return acc
      }, {})
    })
    .then((hash) => {
      applyKeys(config, hash)
      return hash
    })
}

function getKey (prefix, fullKey) {
  return fullKey.split(prefix)[1].slice(1)
}

function lockRestart (client, config) {
  if (!config.lock) {
    const lock = new Lock(client, `${config.prefix}-lock`, LOCK_ID, config.lockTtl || LOCK_TTL)
    config.lock = lock
  }
  return config.lock
}

function watch (client, config, onChange) {
  const watcher = client.watcher(config.prefix, null, {recursive: true})
  watcher.on('change', (change) => {
    applyChange(config, change)
    onChange(change)
  })
  config.watcher = watcher
}

module.exports = function (options = { url: DEFAULT_URL }) {
  const client = new Etcd(options.url)
  return {
    fetchConfig: fetchConfig.bind(null, client),
    lockRestart: lockRestart.bind(null, client),
    watch: watch.bind(null, client)
  }
}
