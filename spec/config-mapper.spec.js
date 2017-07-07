require('./setup')

const configMapper = require('../src/config-mapper')

describe('Config Mapper', function () {
  let hashOne
  let hashTwo
  let hashThree
  let hashFour
  let hashFive
  before(function () {
    hashOne = configMapper.load('./spec/.kickerd.toml.one')
    hashTwo = configMapper.load('./spec/.kickerd.toml.two')
    hashThree = configMapper.load('./spec/configuration.tmpl.three')
    hashFour = configMapper.load('./spec/.kickerd.toml.three')
    hashFive = configMapper.load('./spec/.kickerd.toml.four')
  })

  it('should backfill start using main property when start property and start script is missing', function () {
    hashOne.should.eql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', default: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', default: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', default: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should backfill name and description with package properties', function () {
    hashTwo.should.eql({
      name: 'kickerd',
      description: 'source configuration from various inputs and kick the service when they change',
      start: 'node ./src',
      sets: [
        { env: 'TITLE', key: 'site-title', default: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', default: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', default: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should support `app` in place of name', function () {
    hashThree.should.eql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', default: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', default: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', default: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should tie in argument list', function () {
    hashFour.should.eql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', argument: 'page-title', default: 'Demo', type: 'string' },
        { env: 'PORT', key: 'site-port', argument: 'host-port', default: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', argument: 'message-of-the-day', default: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', key: 'site-org' }
      ]
    })
  })

  it('should tie in argument list with defaults', function () {
    hashFive.should.eql({
      name: 'test-app-1',
      description: 'test description 1',
      start: 'node ./src/index.js',
      sets: [
        { env: 'TITLE', key: 'site-title', argument: 'page-title', default: 'Demo', type: 'string' },
        { env: 'PORT', argument: 'host-port', default: 8008, type: 'number' },
        { env: 'MOTD', key: 'site-motd', argument: 'message-of-the-day', default: 'Ohhai, it\'s a thing', type: 'string' },
        { env: 'ORG', argument: 'org-name', default: 'Acme', type: 'string' },
        { env: 'RESTART', argument: 'restart-on-fail', default: true, type: 'boolean' }
      ]
    })
  })
})
