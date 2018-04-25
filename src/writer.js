const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

function hasFiles (configuration) {
  return configuration.sets.reduce((flag, set) => {
    if (set.file) {
      flag = true
    }
    return flag
  }, false)
}

function ensurePath (dir, fullPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dir)) {
      mkdirp(dir, (err) => {
        if (err) {
          reject(new Error(`Failed to create path '${dir}' for configuration file '${fullPath}':\n\t${err.message}`))
        } else {
          resolve()
        }
      })
    } else {
      resolve()
    }
  })
}

function writeFile (definition) {
  return new Promise((resolve, reject) => {
    const fullPath = path.resolve(definition.file)
    const dir = path.dirname(fullPath)
    return ensurePath(dir, fullPath)
      .then(
        () => {
          if (definition.value || !fs.existsSync(fullPath)) {
            return fs.writeFile(fullPath, definition.value, 'utf8', (err) => {
              if (err) {
                reject(new Error(`Failed to write file '${fullPath}':\n\t${err.message}`))
              } else {
                resolve()
              }
            })
          } else {
            resolve()
          }
        }
      )
  })
}

function writeFiles (configuration) {
  return Promise.all(
    configuration.sets.reduce((acc, set) => {
      if (set.file) {
        acc.push(writeFile(set))
      }
      return acc
    }, [])
  )
}

module.exports = {
  hasFiles: hasFiles,
  writeFile: writeFile,
  writeFiles: writeFiles
}
