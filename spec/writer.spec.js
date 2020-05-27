require('./setup')
const chai = require('chai')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const writer = require('../src/writer')

const HTPASSWD = 'admin:$2a$10$Gc0JyHlN.yqqdHw8.yhUZu.6WSpyV0uoT5sMMEt8HSynupsDO6tbe\n'
const TEST_TXT = 'this\nis\na\ntest\n'
const FLAT_PATH = './spec/test-files/flat/test.txt'
const PASS_PATH = './spec/test-files/password/htpasswd'

describe('Writer', function () {
  it('should write files in configuration sets', function () {
    const configuration = {
      sets: [
        {},
        { file: PASS_PATH, value: HTPASSWD },
        {},
        { file: FLAT_PATH, value: TEST_TXT },
        {}
      ]
    }

    writer.writeFiles(configuration).then(() => {
      const writtenPass = fs.readFileSync(path.resolve(PASS_PATH), 'utf8')
      const writtenText = fs.readFileSync(path.resolve(FLAT_PATH), 'utf8')
      writtenPass.should.equal(HTPASSWD)
      writtenText.should.equal(TEST_TXT)
    })
  })

  it('should skip mkdirp call if dir exists', async () => {
    const configuration = {
      sets: [
        {},
        { file: path.resolve('./spec/existing-dir.txt'), value: '' }
      ]
    }

    return new Promise((resolve, reject) => {
      writer.writeFiles(configuration).then(
        () => resolve())
        .catch((err) => {
          reject(new Error(`Unexpected error raised by 'writeFiles': ${err}`))
        })
    })
  })

  it('should report failure if mkdirp fails', () => {
    const configuration = {
      sets: [
        {},
        { file: '/sys/fail/can', value: '' }
      ]
    }

    return chai.expect(writer.writeFiles(configuration))
      .to.eventually.be.rejectedWith('Failed to create path \'/sys/fail\' for configuration file \'/sys/fail/can\'')
  })

  it('should just resolve if file exists', () => {
    sinon.restore()
    const fsStub = sinon.stub(fs, 'existsSync')
    fsStub.returns(true)
    const configuration = {
      sets: [
        {},
        { file: '/sys/impossible.txt', value: '' }
      ]
    }

    return chai.expect(writer.writeFiles(configuration))
      .to.eventually.be.fulfilled
  })

  it('should fail if file write fails', () => {
    sinon.restore()
    const fsExistsStub = sinon.stub(fs, 'existsSync')
    fsExistsStub.onFirstCall()
      .returns(true)
      .onSecondCall()
      .returns(false)
    const configuration = {
      sets: [
        {},
        { file: '/sys/impossible.txt', value: '' }
      ]
    }

    return chai.expect(writer.writeFiles(configuration))
      .to.eventually.be.rejectedWith('Failed to write file \'/sys/impossible.txt\':\n\tENOENT: no such file or directory, open \'/sys/impossible.txt\'')
  })

  after(function (done) {
    fs.unlinkSync('./spec/existing-dir.txt')

    rimraf('./spec/test-files', (err) => {
      if (err) {
        console.log('Writer Spec - file system cleanup failed')
      }
      done()
    })
  })
})
