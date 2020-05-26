require('./setup')

const configMapper = require('../src/config-mapper')
const fs = require('fs')
const path = require('path')
const sinon = require('sinon')
const writer = require('../src/writer')

describe('Config Mapper', function () {
  let hashOne
  let hashTwo
  let hashThree
  let hashFour
  let hashFive
  let hashSix
  before(function () {
    hashOne = configMapper.load('./spec/.kickerd.toml.one')
    hashTwo = configMapper.load('./spec/.kickerd.toml.two')
    hashThree = configMapper.load('./spec/configuration.tmpl.three')
    hashFour = configMapper.load('./spec/.kickerd.toml.three')
    hashFive = configMapper.load('./spec/.kickerd.toml.four')
    hashSix = configMapper.load('./spec/.kickerd.toml.six')
  })

  it('should backfill start using main property when start property and start script is missing', function () {
    return hashOne.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', value: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should backfill name and description with package properties', function () {
    return hashTwo.should.partiallyEql({
      name: 'kickerd',
      description: 'source configuration from various inputs and kick the service when they change',
      start: 'node ./src',
      sets: [
        { env: 'TITLE', key: 'site-title', value: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should support `app` in place of name', function () {
    return hashThree.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', value: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should tie in argument list', function () {
    return hashFour.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', argument: 'page-title', value: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', argument: 'host-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', argument: 'message-of-the-day', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should tie in argument list with defaults', function () {
    return hashFive.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', argument: 'page-title', value: 'Demo', type: 'string' },
        { env: 'PORT', argument: 'host-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', argument: 'message-of-the-day', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', argument: 'org-name', value: 'Acme', type: 'string' },
        { env: 'RESTART', argument: 'restart-on-fail', value: true, type: 'boolean' }
      ]
    })
  })

  it('should tie in file with defaults', function () {
    return hashSix.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', argument: 'page-title', value: 'Demo', type: 'string' },
        { env: 'PORT', argument: 'host-port', value: 8008, type: 'number' },
        { file: '/etc/nginx/htpasswd', key: 'nginx-password' },
        { file: 'spec/test.txt', key: 'test-file' },
        { file: 'default/value', key: 'test-file 2' }
      ]
    })
  })

  it('should detect when files are present', function () {
    writer.hasFiles(hashOne).should.equal(false)
    writer.hasFiles(hashTwo).should.equal(false)
    writer.hasFiles(hashThree).should.equal(false)
    writer.hasFiles(hashFour).should.equal(false)
    writer.hasFiles(hashFive).should.equal(false)
    writer.hasFiles(hashSix).should.equal(true)
  })

  it('should handle missing packagePath by not adding start', function () {
    sinon.stub(fs, 'existsSync').returns(false)

    const noPackagePath = configMapper.load('./spec/.kickerd.toml.one')

    return noPackagePath.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      sets: [
        { env: 'TITLE', key: 'site-title', value: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should get start from package.json if available', function () {
    const replacementPackagePath = path.resolve(process.cwd(), './spec/.packageWithStart.json')
    const stubPathResolve = sinon.stub(path, 'resolve')
    stubPathResolve.onCall(0).returns(replacementPackagePath).callThrough()

    const noPackagePath = configMapper.load('./spec/.kickerd.toml.one')

    return noPackagePath.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'my start',
      sets: [
        { env: 'TITLE', key: 'site-title', value: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should override defaults with process.env', function () {
    process.env.TITLE = 'From Env'

    const hashOneWithEnv = configMapper.load('./spec/.kickerd.toml.one')

    return hashOneWithEnv.should.partiallyEql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', value: 'From Env', type: 'string' },
        { env: 'PORT', key: 'site-port', value: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', value: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  afterEach(function () {
    sinon.restore()
  })
})
