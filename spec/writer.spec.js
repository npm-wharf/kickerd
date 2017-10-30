require('./setup')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const writer = require('../src/writer')

const HTPASSWD = 'admin:$2a$10$Gc0JyHlN.yqqdHw8.yhUZu.6WSpyV0uoT5sMMEt8HSynupsDO6tbe\n'
const TEST_TXT = 'this\nis\na\ntest\n'
const FLAT_PATH = './spec/test-files/flat/test.txt'
const PASS_PATH = './spec/test-files/password/htpasswd'

describe('Writer', function () {
  let configuration
  before(function () {
    configuration = {
      sets: [
        {},
        { file: PASS_PATH, value: HTPASSWD },
        {},
        { file: FLAT_PATH, value: TEST_TXT },
        {}
      ]
    }
    return writer.writeFiles(configuration)
  })

  it('should write files in configuration sets', function () {
    const writtenPass = fs.readFileSync(path.resolve(PASS_PATH), 'utf8')
    const writtenText = fs.readFileSync(path.resolve(FLAT_PATH), 'utf8')
    writtenPass.should.equal(HTPASSWD)
    writtenText.should.equal(TEST_TXT)
  })

  after(function (done) {
    rimraf('./spec/test-files', (err) => {
      if (err) {
        console.log('Writer Spec - file system cleanup failed')
      }
      done()
    })
  })
})
