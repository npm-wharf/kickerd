require('./setup')
const chai = require('chai')
const path = require('path')
const sinon = require('sinon')
chai.use(require('sinon-chai'))
const FILENAME = 'bootstrap.sh'
const FILEPATH = path.resolve(process.cwd(), FILENAME)

const bootStrap = require('../src/bootstrap-template')
const fs = require('fs')
const script = fs.readFileSync('./spec/expected-bootstrap.sh', 'utf8')
const context = {
  name: 'appName',
  start: 'node ./src',
  sets: [
    { env: 'VAL_ONE', value: 1, type: 'number' },
    { env: 'VAL_TWO', value: 'two', argument: 'val-two' },
    { env: 'VAL_THREE', value: 'Hello, World' },
    { env: 'VAL_FOUR', value: true, type: 'boolean', argument: 'val-four' }
  ]
}

describe('Bootstrap Template', function () {
  it('should produce start script template with correct variable directives', function () {
    bootStrap.generate(context)

    const result = fs.readFileSync('./bootstrap.sh', 'utf8')
    result.should.eql(script)

    fs.unlinkSync('./bootstrap.sh')
  })

  it('should log file write errors to console', function () {
    const consoleSpy = sinon.spy(console, 'log')
    sinon.stub(fs, 'writeFileSync').throws(new Error('I stubbed my toe'))

    bootStrap.generate(context)

    sinon.restore()
    chai.expect(consoleSpy).to.have.been.calledWithMatch(`Failed to write ${FILEPATH}: I stubbed my toe`)
  })
})
