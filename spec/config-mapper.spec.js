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
})
