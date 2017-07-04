require('./setup')

const Etcd = require('node-etcd')
const etcdFn = require('../src/etcd')
const ETCD_URL = 'http://localhost:2379'
const PREFIX = 'kickerd/development'

function set (client, key, value) {
  return new Promise(function (resolve, reject) {
    client.set(`${PREFIX}/${key}`, value, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function setAll (client, list) {
  return Promise.all(
    list.map(pair => set(client, pair.key, pair.value))
  )
}

describe('Etcd', function () {
  const client = new Etcd(ETCD_URL)
  let etcd
  describe('when fetching initial keys', function () {
    before(function () {
      etcd = etcdFn({url: ETCD_URL})
      return setAll(client, [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
        { key: 'c', value: '3' }
      ])
    })

    it('should fetch keys', function () {
      return etcd.fetchConfig({prefix: PREFIX})
        .should.eventually.eql({ a: '1', b: '2', c: '3' })
    })

    after(function (done) {
      client.del(PREFIX, () => done())
    })
  })
})
