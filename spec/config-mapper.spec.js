require('./setup')

const configMapper = require('../src/config-mapper')

describe('Config Mapper', function () {
  let hashOne
  let hashTwo
  let hashThree
  before(function () {
    hashOne = configMapper.load('./spec/.kickerd.toml.one')
    hashTwo = configMapper.load('./spec/.kickerd.toml.two')
    hashThree = configMapper.load('./spec/configuration.tmpl.three')
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
})
