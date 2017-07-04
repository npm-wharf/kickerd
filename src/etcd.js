const Etcd = require('node-etcd')
const DEFAULT_URL = 'http://localhost:2379'

function fetchConfig (client, config) {
  return new Promise((resolve, reject) => {
    client.get(config.prefix, (err, response) => {
      if (err) {
        reject(err)
      } else {
        const hash = response.node.nodes.reduce((acc, node) => {
          const key = node.key.split(config.prefix)[1].slice(1)
          acc[key] = node.value
          return acc
        }, {})
        resolve(hash)
      }
    })
  })
}

module.exports = function (options = { url: DEFAULT_URL }, proxy) {
  const client = proxy || new Etcd(options.url)
  return {
    fetchConfig: fetchConfig.bind(null, client)
  }
}
