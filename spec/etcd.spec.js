/* eslint-disable no-sparse-arrays */
require('./setup')

const Etcd = require('node-etcd')
const etcdFn = require('../src/etcd')
const Definition = require('../src/definition')
const ETCD_URL = 'http://localhost:12379'
const PREFIX = 'development'
const NAME = 'kickerd'
const GROUP = 'replica'
const FILE_CONTENT = 'these are some\nfile contents\nlook at \'em!'

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

function initConfig (hash) {
  hash.sets = hash.sets.map(x => new Definition(x.key.toUpperCase(), null, x.key))
  return hash
}

// NOTE: These tests cannot be run in isolation
describe('Etcd', function () {
  describe('with default URL', function () {
    const defaultFn = etcdFn()
    defaultFn.clientUrl.should.eql('http://localhost:2379')
  })

  const client = new Etcd(ETCD_URL)
  let etcd
  const keyList = [
    { key: 'a', value: '1' },
    { key: 'b', value: '2' },
    { key: 'c', value: '3' },
    { key: 'd', value: '4' },
    { key: 'e', value: '6' },
    { key: `d.${NAME}`, value: '5' },
    { key: `e.${NAME}.${GROUP}`, value: 'hello' },
    { key: 'g', value: FILE_CONTENT }
  ]
  const config = initConfig({
    prefix: PREFIX,
    group: GROUP,
    name: NAME,
    sets: [
      { key: 'a' },
      { key: 'b' },
      { key: 'c' },
      { key: 'd' },
      { key: 'e' },
      { key: 'g' }
    ]
  })
  describe('when fetching initial keys', function () {
    before(function () {
      etcd = etcdFn({ url: ETCD_URL })
      return setAll(client, keyList)
    })

    it('does not raise exception if prefix does not yet exist', function () {
      return etcd.fetchConfig({ prefix: 'batman', sets: [] })
        .should.eventually.eql({})
    })

    it('should fetch keys', function () {
      return etcd.fetchConfig(config)
        .should.eventually.partiallyEql({
          a: [, , '1'],
          b: [, , '2'],
          c: [, , '3'],
          d: [, , '4', '5'],
          e: [, , '6', , 'hello'],
          g: [, ,] // eslint-disable-line comma-spacing
        })
    })

    it('should apply keys to configuration', function () {
      return config.sets.should.partiallyEql([
        { key: 'a', value: '1', type: 'number', level: 2 },
        { key: 'b', value: '2', type: 'number', level: 2 },
        { key: 'c', value: '3', type: 'number', level: 2 },
        { key: 'd', value: '5', type: 'number', level: 3 },
        { key: 'e', value: 'hello', type: 'string', level: 4 }
      ])
    })

    describe('when pushing keys which weren\'t initialised', function () {
      before(function () {
        etcd = etcdFn({ url: ETCD_URL })
        config.sets.push({ key: 'h', value: 'Is this added?', type: 'string', level: 3 })
      })

      it('should not add those keys', function () {
        return etcd.fetchConfig(config)
          .should.eventually.partiallyEql({
            a: [, , '1'],
            b: [, , '2'],
            c: [, , '3'],
            d: [, , '4', '5'],
            e: [, , '6', , 'hello'],
            g: [, ,] // eslint-disable-line comma-spacing
          })
      })

      after(function () {
        config.sets.pop()
      })
    })

    describe('when watched key changes at same level of specificity', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => set(client, 'a', '1.5'), 50)
      })

      it('should pick up change', function () {
        changed.action.should.eql('set')
        changed.node.key.should.eql(`/${PREFIX}/a`)
        changed.node.value.should.eql('1.5')
        return config.sets.should.partiallyEql([
          { key: 'a', value: '1.5', type: 'number', level: 2 },
          { key: 'b', value: '2', type: 'number', level: 2 },
          { key: 'c', value: '3', type: 'number', level: 2 },
          { key: 'd', value: '5', type: 'number', level: 3 },
          { key: 'e', value: 'hello', type: 'string', level: 4 }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when watched key changes at group level', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => set(client, `e.${NAME}.${GROUP}`, 'goodbye'), 50)
      })

      it('should pick up change', function () {
        changed.action.should.eql('set')
        changed.node.key.should.eql(`/${PREFIX}/e.${NAME}.${GROUP}`)
        changed.node.value.should.eql('goodbye')
        return config.sets.should.partiallyEql([
          { key: 'a', value: '1.5', type: 'number', level: 2 },
          { key: 'b', value: '2', type: 'number', level: 2 },
          { key: 'c', value: '3', type: 'number', level: 2 },
          { key: 'd', value: '5', type: 'number', level: 3 },
          { key: 'e', value: 'goodbye', type: 'string', level: 4 }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when watched key changes', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => set(client, `a.${NAME}`, '1.1'), 50)
      })

      it('should pick up change', function () {
        changed.action.should.eql('set')
        changed.node.key.should.eql(`/${PREFIX}/a.${NAME}`)
        changed.node.value.should.eql('1.1')
        return config.sets.should.partiallyEql([
          { key: 'a', value: '1.1', type: 'number', level: 3 },
          { key: 'b', value: '2', type: 'number', level: 2 },
          { key: 'c', value: '3', type: 'number', level: 2 },
          { key: 'd', value: '5', type: 'number', level: 3 },
          { key: 'e', value: 'goodbye', type: 'string', level: 4 }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when watched prefix changes key at less specific level', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => set(client, 'd', '4'), 50)
      })

      it('should not overwrite value and changed should be ignore', function () {
        changed.action.should.eql('ignore')
        changed.node.key.should.eql(`/${PREFIX}/d`)
        changed.node.value.should.eql('4')
        return config.sets.should.partiallyEql([
          { key: 'a', value: '1.1', type: 'number', level: 3 },
          { key: 'b', value: '2', type: 'number', level: 2 },
          { key: 'c', value: '3', type: 'number', level: 2 },
          { key: 'd', value: '5', type: 'number', level: 3 },
          { key: 'e', value: 'goodbye', type: 'string', level: 4 }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when watched prefix adds a new key', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => set(client, 'f', '6'), 50)
      })

      it('should pick up add', function () {
        changed.action.should.eql('add')
        changed.node.key.should.eql(`/${PREFIX}/f`)
        changed.node.value.should.eql('6')
        return config.sets.should.partiallyEql([
          { key: 'a', value: '1.1', type: 'number', level: 3 },
          { key: 'b', value: '2', type: 'number', level: 2 },
          { key: 'c', value: '3', type: 'number', level: 2 },
          { key: 'd', value: '5', type: 'number', level: 3 },
          { key: 'e', value: 'goodbye', type: 'string', level: 4 },
          { key: 'g', value: 'these are some\nfile contents\nlook at \'em!', type: 'string', level: 2 },
          { key: 'f', value: '6', type: 'number', level: 2 }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when watched prefix removes a key at highest specificity', function () {
      let changed
      before(function (done) {
        etcd.watch(config, (x) => {
          changed = x
          done()
        })
        setTimeout(() => client.del(`${PREFIX}/d.${NAME}`), 50)
      })

      it('should pick up delete and fall back to previous level', function () {
        changed.action.should.eql('delete')
        changed.node.key.should.eql(`/${PREFIX}/d.${NAME}`)
        changed.prevNode.value.should.eql('5')
        return config.sets.should.partiallyEql([
          { key: 'a', value: '1.1', type: 'number', level: 3 },
          { key: 'b', value: '2', type: 'number', level: 2 },
          { key: 'c', value: '3', type: 'number', level: 2 },
          { key: 'd', value: '4', type: 'number', level: 2 },
          { key: 'e', value: 'goodbye', type: 'string', level: 4 },
          { key: 'g', value: 'these are some\nfile contents\nlook at \'em!', type: 'string', level: 2 },
          { key: 'f', value: '6', type: 'number', level: 2 }
        ])
      })

      after(function () {
        config.watcher.stop()
      })
    })

    describe('when name is wrong', function () {
      before(function () {
        return set(client, 'e.nameincorrect', 'Undefined name')
      })

      it('should not override existing key', function () {
        return etcd.fetchConfig(config)
          .should.eventually.partiallyEql({
            a: [, , '1.5'],
            b: [, , '2'],
            c: [, , '3'],
            d: [, , '4'],
            e: [, , '6', , 'goodbye'],
            g: [, ,] // eslint-disable-line comma-spacing
          })
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
