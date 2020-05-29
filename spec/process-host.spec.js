require('./setup')
const fs = require('fs')
const stream = require('stream')
const processHost = require('../src/process-host')
const http = require('http')

class EchoStream extends stream.Writable {
  constructor () {
    super()
    this.content = []
  }

  _write (chunk, enc, next) {
    chunk
      .toString()
      .split('\n')
      .map(line => { if (line) this.content.push(line) })
    next()
  }
}

describe('Process Host', function () {
  let configuration
  let output
  let exited = false
  let wroteFiles = false
  const TIMEOUT = process.env.TRAVIS ? 4000 : 1000

  function startProcess (done) {
    output = new EchoStream()
    configuration = {
      cwd: './example/app',
      start: 'node index.js',
      sets: [
        { env: 'TITLE', value: 'http' },
        { env: 'PORT', value: 8018, type: 'number' },
        { env: 'MOTD', value: 'this is a test of sorts' },
        { env: 'UINDEFINED' },
        { env: 'GREETING_ROUTE', value: '/custom-greeting', argument: 'greeting-route' },
        { env: 'GREETING_MESSAGE', value: 'hey, look, it\'s a message', argument: 'greeting-message' }
      ]
    }
    fs.writeFileSync('./example/app/app.cfg', 'test file', 'utf8')
    processHost.start(configuration, () => { exited = true })
    configuration.process.stdout.pipe(output)
    setTimeout(() => done(), TIMEOUT)
  }

  before(function (done) {
    this.timeout(10000)
    startProcess(done)
  })

  it('should not exit unexpectedly', function () {
    exited.should.eql(false)
  })

  it('should log expected results to stdio', function () {
    output.content.should.eql([
      'Starting http at port 8018',
      'this is a test of sorts',
      'test file'
    ])
  })

  it('should be serving requests', function (done) {
    http.request({
      path: '/custom-greeting',
      port: 8018
    }, (res) => {
      const raw = []
      res.on('data', chunk => {
        raw.push(chunk.toString())
      })
      res.on('end', () => {
        raw.join('').should.eql('{"greeting":"hey, look, it\'s a message"}')
        done()
      })
      res.statusCode.should.eql(200)
    }).end()
  })

  it('should restart on command', function (done) {
    this.timeout(10000)
    configuration.sets[2].value = 'oh look, a new MOTD'
    processHost.restart(
      configuration,
      () => {
        wroteFiles = true
        return Promise.resolve()
      },
      () => { exited = true }
    )
      .then(() => {
        setTimeout(() => done(), TIMEOUT)
      })
  })

  it('should have written files during restart', function () {
    wroteFiles.should.equal(true)
  })

  it('should reflect a new MOTD after restart', function (done) {
    http.request({
      port: 8018
    }, (res) => {
      const raw = []
      res.on('data', chunk => {
        raw.push(chunk.toString())
      })
      res.on('end', () => {
        raw.join('').should.eql('oh look, a new MOTD')
        done()
      })
      res.statusCode.should.eql(200)
    }).end()
  })

  it('should show shutdown in log entries', function () {
    output.content.should.eql([
      'Starting http at port 8018',
      'this is a test of sorts',
      'test file',
      'shutting down'
    ])
  })

  it('should stop on command', function () {
    return processHost.stop(configuration)
  })

  describe('failure cases', function () {
    beforeEach(function (done) {
      this.timeout(10000)
      startProcess(done)
    })

    it('should run onExit() if the child process exits outside stop command', function () {
      delete configuration.waiting
      configuration.process.emit('close')
      exited.should.eql(true)
    })

    it('should run onError() if the child process raises an error', function () {
      sinon.stub(process, 'exit')
      configuration.process.emit('error', new Error('Oh no!'))
      sinon.assert.calledWith(process.exit, 100)
    })

    it('should return waiting promise if already set', function () {
      const output = processHost.stop({
        process: 'fake',
        waiting: { promise: 'should be returned' }
      })
      output.should.be.eql('should be returned')
    })

    afterEach(function () {
      sinon.restore()
      processHost.stop(configuration)
    })
  })

  after(function () {
    fs.unlinkSync('./example/app/app.cfg')
  })
})
