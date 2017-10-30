require('./setup')

const Kicker = require('../src/kicker')

const bootStrap = {
  generate: () => {},
  transform: () => {}
}

const configMapper = { load: () => {} }

const etcd = {
  fetchConfig: () => {},
  lockRestart: () => {},
  watch: (x, y) => { this.changeHandler = y }
}

const lock = {
  lock: () => {},
  unlock: () => {}
}

class Log {
  constructor () {
    this.entries = []
  }
  reset () { this.entries = [] }
  debug (x) { this.entries.push(x) }
  info (x) { this.entries.push(x) }
  warn (x) { this.entries.push(x) }
  error (x) { this.entries.push(x) }
}

const processHost = {
  restart: () => {},
  start: () => {},
  stop: () => {}
}

const writer = {
  hasFiles: () => {},
  writeFiles: () => {}
}

const ORIGINAL_EXIT = process.exit

function captureExit (fn) {
  process.exit = fn
}

function releaseExit () {
  process.exit = ORIGINAL_EXIT
}

describe('Kicker', function () {
  describe('when successfully generating a bootstrap', function () {
    let kicker, bootStrapMock, configMapperMock, etcdMock, writerMock, configuration, log, args
    before(function () {
      log = new Log()
      args = {
        file: './.kicker.toml',
        bootstrap: true,
        prefix: 'test'
      }
      configuration = {}
      bootStrapMock = sinon.mock(bootStrap)
      configMapperMock = sinon.mock(configMapper)
      etcdMock = sinon.mock(etcd)
      writerMock = sinon.mock(writer)
      kicker = new Kicker(bootStrap, configMapper, () => etcd, log, {}, writer)
      bootStrapMock
        .expects('generate')
        .withArgs(configuration)
        .resolves({})
      configMapperMock
        .expects('load')
        .withArgs('./.kicker.toml')
        .returns(configuration)
      etcdMock
        .expects('fetchConfig')
        .withArgs(configuration)
        .resolves({})
      writerMock
        .expects('hasFiles')
        .withArgs(configuration)
        .returns(true)
      writerMock
        .expects('writeFiles')
        .withArgs(configuration)
        .resolves(true)
      return kicker.kick(args)
    })

    it('should generate bootstrap file', function () {
      bootStrapMock.verify()
      configMapperMock.verify()
      etcdMock.verify()
      writerMock.verify()
    })

    it('should log progess', function () {
      log.entries.should.eql([
        'Fetching configuration from etcd for key space \'test\'',
        'Configuration (application state)',
        configuration,
        'writing configuration files to disk',
        'bootstrap file generated successfully'
      ])
    })
  })

  describe('when successfully hosting process', function () {
    let kicker, bootStrapMock, configMapperMock, etcdMock, processHostMock, writerMock, configuration, log, args
    before(function () {
      log = new Log()
      args = {
        file: './.kicker.toml',
        prefix: 'test'
      }
      configuration = { dontRetry: true, changeWait: 0.1 }
      bootStrapMock = sinon.mock(bootStrap)
      configMapperMock = sinon.mock(configMapper)
      etcdMock = sinon.mock(etcd)
      processHostMock = sinon.mock(processHost)
      writerMock = sinon.mock(writer)
      kicker = new Kicker(bootStrap, configMapper, () => etcd, log, processHost, writer)
      configMapperMock
        .expects('load')
        .withArgs('./.kicker.toml')
        .returns(configuration)
      etcdMock
        .expects('fetchConfig')
        .withArgs(configuration)
        .resolves({})
      etcdMock
        .expects('watch')
        .withArgs(configuration, kicker.wait)
      processHostMock
        .expects('start')
        .withArgs(configuration, kicker.onExit)
        .resolves({})
      writerMock
        .expects('hasFiles')
        .withArgs(configuration)
        .returns(true)
      writerMock
        .expects('writeFiles')
        .withArgs(configuration)
        .resolves(true)
      return kicker.kick(args)
    })

    it('should host the process', function () {
      bootStrapMock.verify()
      configMapperMock.verify()
      processHostMock.verify()
      etcdMock.verify()
      writerMock.verify()
    })

    it('should log progess', function () {
      log.entries.should.eql([
        'Fetching configuration from etcd for key space \'test\'',
        'Configuration (application state)',
        configuration,
        'writing configuration files to disk',
        'Starting service'
      ])
    })

    describe('when an ignored change occurs', function () {
      let restartSpy
      before(function () {
        log.reset()
        restartSpy = sinon.spy(processHost, 'restart')
      })

      it('should do nothing', function () {
        return kicker.wait({ action: 'ignore', node: { key: 'nada' } })
          .then(() => {
            log.entries.should.eql([
            ])
            restartSpy.notCalled.should.equal(true)
          })
      })

      after(function () {
        restartSpy.restore()
      })
    })

    describe('when a change occurs - no lock required', function () {
      before(function () {
        log.reset()
        writerMock.restore()
        writerMock = sinon.mock(writer)
        processHostMock
          .expects('restart')
          .withArgs(kicker.configuration, kicker.writeFiles, kicker.onExit)
          .callsArg(1)
          .resolves({})
        writerMock
          .expects('hasFiles')
          .withArgs(configuration)
          .returns(true)
        writerMock
          .expects('writeFiles')
          .withArgs(configuration)
          .resolves(true)
      })

      it('should restart process immediately', function () {
        return kicker.wait({ node: { key: 'nada' } })
          .then(() => {
            log.entries.should.eql([
              'Change detected - waiting for 0.1 seconds before applying change',
              'Configuration change detected on key \'nada\'',
              'writing configuration files to disk'
            ])
            processHostMock.verify()
            writerMock.verify()
          })
      })
    })

    describe('when a change occurs - lock acquisition fails', function () {
      let lockMock
      before(function () {
        kicker.configuration.lockRestart = true
        log.reset()
        processHostMock = sinon.mock(processHost)
        lockMock = sinon.mock(lock)
        lockMock
          .expects('lock')
          .rejects(new Error('no lock for you'))
        etcdMock
          .expects('lockRestart')
          .withArgs(kicker.configuration)
          .returns(lock)
        processHostMock
          .expects('restart')
          .never()
      })

      it('should restart process immediately', function () {
        return kicker.wait({ node: { key: 'nada' } })
          .then(
            null,
            () => {
              log.entries.should.eql([
                'Change detected - waiting for 0.1 seconds before applying change',
                'Configuration change detected on key \'nada\'',
                'Acquiring restart lock',
                'Failed to acquire lock, trying again in 5 seconds : no lock for you'
              ])
              lockMock.verify()
              etcdMock.verify()
              processHostMock.verify()
            }
          )
      })

      after(function () {
        processHostMock.restore()
        lockMock.restore()
        etcdMock.restore()
        writerMock.restore()
        delete kicker.configuration.lockRestart
      })
    })

    describe('when a change occurs - lock acquired successfully', function () {
      let lockMock
      before(function () {
        kicker.configuration.lockRestart = true
        log.reset()
        etcdMock = sinon.mock(etcd)
        processHostMock = sinon.mock(processHost)
        lockMock = sinon.mock(lock)
        writerMock = sinon.mock(writer)
        lockMock
          .expects('lock')
          .resolves({})
        lockMock
          .expects('unlock')
          .resolves({})
        etcdMock
          .expects('lockRestart')
          .withArgs(kicker.configuration)
          .returns(lock)
        processHostMock
          .expects('restart')
          .withArgs(kicker.configuration, kicker.writeFiles, kicker.onExit)
          .callsArg(1)
          .resolves({})
        writerMock
          .expects('hasFiles')
          .withArgs(configuration)
          .returns(true)
        writerMock
          .expects('writeFiles')
          .withArgs(configuration)
          .resolves(true)
      })

      it('should restart process immediately', function () {
        return kicker.wait({ node: { key: 'nada' } })
          .then(() => {
            log.entries.should.eql([
              'Change detected - waiting for 0.1 seconds before applying change',
              'Configuration change detected on key \'nada\'',
              'Acquiring restart lock',
              'Restart lock acquired successfully',
              'Configuration (application state)',
              kicker.configuration,
              'writing configuration files to disk'
            ])
            lockMock.verify()
            etcdMock.verify()
            processHostMock.verify()
            writerMock.verify()
          })
      })

      after(function () {
        delete kicker.configuration.lockRestart
      })
    })

    describe('when the process exits', function () {
      let exit
      before(function () {
        exit = sinon.stub()
        log.reset()
        captureExit(exit)
        kicker.onExit()
        releaseExit()
      })

      it('should log and exit', function () {
        log.entries.should.eql([
          'Hosted service quit unexpectedly - exiting'
        ])
        exit.calledOnce.should.equal(true)
      })

      after(function () {
        log.reset()
      })
    })
  })

  describe('when fetching configuration from etcd fails', function () {
    let kicker, configMapperMock, etcdMock, configuration, log, args, exit
    before(function () {
      log = new Log()
      args = {
        file: './.kicker.toml',
        bootstrap: true,
        prefix: 'dev',
        etcd: 'http://localhost:2379'
      }
      configuration = {
      }
      configMapperMock = sinon.mock(configMapper)
      configMapperMock
        .expects('load')
        .withArgs('./.kicker.toml')
        .returns(configuration)
      etcdMock = sinon.mock(etcd)
      etcdMock
        .expects('fetchConfig')
        .withArgs(configuration)
        .rejects(new Error('nope forever'))
      exit = sinon.stub()

      captureExit(exit)
      kicker = new Kicker(bootStrap, configMapper, () => etcd, log, {})
      return kicker.kick(args)
    })

    it('should exit on error', function () {
      configMapperMock.verify()
      etcdMock.verify()
      exit.calledWithExactly(100).should.equal(true)
      exit.calledOnce.should.equal(true)
    })

    it('should log failure', function () {
      log.entries.should.eql([
        'Fetching configuration from etcd for key space \'dev\'',
        'Error retrieving keys for key space \'dev\' from etcd \'http://localhost:2379\': nope forever'
      ])
    })

    after(function () {
      releaseExit()
    })
  })
})
