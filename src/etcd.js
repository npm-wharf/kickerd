const Promise = require('bluebird')
const Etcd = require('node-etcd')
const Lock = require('etcd-lock')
const bole = require('bole')
const log = bole('kickerd')
const Definition = require('./definition')
const DEFAULT_URL = 'http://localhost:2379'
const LOCK_ID = 'kickerd'
const LOCK_TTL = 5

function applyChange (config, change) {
  let match = false
  let changed = false
  const [key, name, group] = getKey(config.prefix, change.node.key)
  const value = change.node.value
  const level = group ? 4 : (name ? 3 : 2)
  config.sets.forEach(definition => {
    if (definition.key === key) {
      match = true
      if (level >= definition.level) {
        if (change.action === 'set') {
          definition.setValue(value, level)
        } else if (change.action === 'delete') {
          definition.clearValue(value, level)
        }
        changed = true
      }
    }
  })
  if (!match && change.action === 'set') {
    const definition = new Definition(toEnvKey(key), null, key)
    definition.setValue(value, level)
    config.sets.push(definition)
    change.action = 'add'
    changed = true
  }
  return changed
}

function applyKeys (config, keys) {
  config.sets.forEach(definition => {
    const levels = keys[definition.key]
    if (levels && levels.length > 0) {
      for (let i = 0; i < levels.length; i++) {
        const value = levels[i]
        if (value != null) {
          definition.setValue(value, i)
        }
      }
    }
  })
  return config
}

function fetchConfig (client, config) {
  const get = Promise.promisify(client.get, {context: client})
  return get(config.prefix, {recursive: true})
    .catch({ errorCode: 100 }, () => {
      // 'Key not found' error.
      return {node: {
        nodes: []
      }}
    })
    .then((response) => {
      return response.node.nodes.reduce((acc, node) => {
        const [key, name, group] = getKey(config.prefix, node.key)
        // as with the service etcetera (https://github.com/npm/etcetera),
        // we accept keys in the format key.app.group.
        if (name === config.name && group === config.group) {
          pushKey(acc, key, node.value, 4)
        } else if (name === config.name) {
          pushKey(acc, key, node.value, 3)
        } else if (name === undefined) {
          pushKey(acc, key, node.value, 2)
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
  return fullKey.split(prefix)[1].slice(1).split('.')
}

function lockRestart (client, config) {
  if (!config.lock) {
    const lock = new Lock(client, `${config.prefix}-lock`, LOCK_ID, config.lockTtl || LOCK_TTL)
    config.lock = lock
  }
  return config.lock
}

function pushKey (acc, key, value, level) {
  let values = acc[key]
  if (!values) {
    values = Array(5)
  }
  values[level] = value
  acc[key] = values
}

function toEnvKey (key) {
  return key.toUpperCase().replace(/[-]/g, '_')
}

function watch (client, config, onChange) {
  const watcher = client.watcher(config.prefix, null, {recursive: true})
  log.info(`Watching for changes in keyspace ${config.prefix}`)
  watcher.on('change', (change) => {
    if (applyChange(config, change) === false) {
      change.action = 'ignore'
    }
    log.info(`change '${change.action}' detected in key ${change.node.key}`)
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
