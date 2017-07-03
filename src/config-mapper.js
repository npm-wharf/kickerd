const fs = require('fs')
const path = require('path')
const toml = require('toml-j0.4')
const packagePath = path.resolve(process.cwd(), './package.json')
const servicePackage = require(packagePath)

function load (configFile) {
  const fullPath = path.resolve(configFile)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const config = toml.parse(raw)
  const scripts = servicePackage.scripts
  const startScript = scripts && scripts.start ? scripts.start : `node ${servicePackage.main}`
  const hash = {
    name: config.name || config.app || servicePackage.name,
    description: config.description || servicePackage.description,
    start: config.start || startScript,
    sets: []
  }
  for (let key in config.environment) {
    let value = config.environment[ key ].replace(/[}{]/g, '')
    const set = { env: key, key: value }
    if (config.default && config.default[key]) {
      let defaultValue = config.default[key]
      set.type = /['"A-Za-z]/.test(defaultValue) ? 'string' : 'number'
      set.default = defaultValue
    }
    hash.sets.push(set)
  }
  return hash
}

module.exports = {
  load: load
}
