require('./setup')
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
  const START_TIMEOUT = process.env.TRAVIS ? 2000 : 500
  before(function (done) {
    this.timeout(5000)
    output = new EchoStream()
    configuration = {
      cwd: './example/app',
      start: 'node index.js',
      sets: [
        { env: 'TITLE', value: 'http' },
        { env: 'PORT', value: 8018 },
        { env: 'MOTD', value: 'this is a test of sorts' },
        { env: 'DEBUG', value: 'express.*' }
      ]
    }
    processHost.start(configuration, () => { exited = true })
    configuration.process.stdout.pipe(process.stdout)
    setTimeout(() => done(), START_TIMEOUT)
  })

  it('should not exit unexpectedly', function () {
    exited.should.eql(false)
  })

  it('should log expected results to stdio', function () {
    output.content.should.eql([
      'Starting http at port 8018',
      'this is a test of sorts'
    ])
  })

  it('should be serving requests', function (done) {
    http.request({
      port: 8018
    }, (res) => {
      let raw = []
      res.on('data', chunk => {
        raw.push(chunk.toString())
      })
      res.on('end', () => {
        raw.join('').should.eql('this is a test of sorts')
        done()
      })
      res.statusCode.should.eql(200)
    }).end()
  })

  it('should restart on command', function (done) {
    this.timeout(5000)
    configuration.sets[2].value = 'oh look, a new MOTD'
    processHost.restart(configuration, () => { exited = true })
      .then(() => {
        setTimeout(() => done(), START_TIMEOUT)
      })
  })

  it('should reflect a new MOTD after restart', function (done) {
    http.request({
      port: 8018
    }, (res) => {
      let raw = []
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
      'shutting down'
    ])
  })

  it('should stop on command', function () {
    return processHost.stop(configuration)
  })
})
