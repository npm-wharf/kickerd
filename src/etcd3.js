const { Etcd3 } = require('etcd3')
const DEFAULT_URL = 'http://localhost:2379'

function trimKeys (prefix, config) {
  const hash = {}
  for (let key in config) {
    hash[key.replace(prefix, '')] = config[ key ]
  }
  return hash
}

function fetchConfig (client, config) {
  return client
    .getAll()
    .prefix(config.prefix)
    .strings()
    .then(
      trimKeys.bind(null, config.prefix)
    )
}

module.exports = function (options = { url: DEFAULT_URL }, proxy) {
  const client = proxy || new Etcd3({ hosts: options.url })
  return {
    fetchConfig: fetchConfig.bind(null, client)
  }
}
