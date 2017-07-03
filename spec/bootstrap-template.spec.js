require('./setup')

const bootStrap = require('../src/bootstrap-template')
const fs = require('fs')
const script = fs.readFileSync('./spec/expected-bootstrap.sh', 'utf8')

describe('Bootstrap Template', function () {
  let context
  before(function () {
    context = {
      name: 'appName',
      start: 'node ./src',
      sets: [
        { env: 'VAL_ONE', value: 1, type: 'number' },
        { env: 'VAL_TWO', value: 'two' },
        { env: 'VAL_THREE', value: 'Hello, World' }
      ]
    }

    bootStrap.generate(context)
  })

  it('should produce start script template with correct variable directives', function () {
    const result = fs.readFileSync('./bootstrap.sh', 'utf8')
    result.should.eql(script)
  })

  after(function () {
    fs.unlinkSync('./bootstrap.sh')
  })
})
