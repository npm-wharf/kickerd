require('./setup')

const Etcd = require('node-etcd')
const etcdFn = require('../src/etcd')
const ETCD_URL = 'http://localhost:2379'
const PREFIX = 'development'
const NAME = 'kickerd'

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
  let keyList = [
    { key: 'a', value: '1' },
    { key: 'b', value: '2' },
    { key: 'c', value: '3' },
    { key: 'd', value: '4' },
    { key: `${NAME}/d`, value: '5' }
  ]
  let config = {
    prefix: PREFIX,
    name: NAME,
    sets: [
      { key: 'a' },
      { key: 'b' },
      { key: 'c' },
      { key: 'd' }
    ]
  }
  describe('when fetching initial keys', function () {
    before(function () {
      etcd = etcdFn({url: ETCD_URL})
      return setAll(client, keyList)
    })

    it('should fetch keys', function () {
      return etcd.fetchConfig(config)
        .should.eventually.eql({ a: '1', b: '2', c: '3', d: '5' })
    })

    it('should apply keys to configuration', function () {
      return config.sets.should.eql([
        { key: 'a', value: '1', type: 'number' },
        { key: 'b', value: '2', type: 'number' },
        { key: 'c', value: '3', type: 'number' },
        { key: 'd', value: '5', type: 'number' }
      ])
    })

    describe('when watched key changes', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => set(client, 'a', '1.1'), 50)
      })

      it('should pick up change', function () {
        changed.action.should.eql('set')
        changed.node.key.should.eql(`/${PREFIX}/a`)
        changed.node.value.should.eql('1.1')
        config.sets.should.eql([
          { key: 'a', value: '1.1', type: 'number' },
          { key: 'b', value: '2', type: 'number' },
          { key: 'c', value: '3', type: 'number' },
          { key: 'd', value: '5', type: 'number' }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when watched prefix adds a key', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => set(client, 'd', '4'), 50)
      })

      it('should pick up add', function () {
        changed.action.should.eql('set')
        changed.node.key.should.eql(`/${PREFIX}/d`)
        changed.node.value.should.eql('4')
        config.sets.should.eql([
          { key: 'a', value: '1.1', type: 'number' },
          { key: 'b', value: '2', type: 'number' },
          { key: 'c', value: '3', type: 'number' },
          { key: 'd', value: '4', type: 'number' }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when watched prefix removes a key', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => client.del(`${PREFIX}/d`), 50)
      })

      it('should pick up delete', function () {
        changed.action.should.eql('delete')
        changed.node.key.should.eql(`/${PREFIX}/d`)
        changed.prevNode.value.should.eql('4')
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when locking restarting', function () {
      it('should create and store a new lock', function () {
        const l1 = etcd.lockRestart(config)
        config.lock.should.equal(l1)
        etcd.lockRestart(config).should.equal(l1)
        delete config.lock
      })

      it('should create and store a lock with custom TTL', function (done) {
        config.lockTtl = 1
        const l1 = etcd.lockRestart(config)
        l1.lock().then(
          () => {
            return l1.unlock()
          }
        )
        .then(() => done())
      })
    })

    after(function (done) {
      client.del(`${PREFIX}/`, { recursive: true }, () => done())
    })
  })
})
