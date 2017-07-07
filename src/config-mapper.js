const fs = require('fs')
const path = require('path')
const toml = require('toml-j0.4')
const packagePath = path.resolve(process.cwd(), './package.json')
const servicePackage = require(packagePath)

function getSet (sets, env) {
  let index = -1
  for (var i = 0; i < sets.length; i++) {
    if (sets[i].env === env) {
      index = i
      break
    }
  }
  return index >= 0 ? sets[index] : null
}

function setDefaultValue (set, value) {
  if (value === true || value === false || /(true|false)/.test(value)) {
    set.type = 'boolean'
  } else {
    set.type = /['"A-Za-z]/.test(value) ? 'string' : 'number'
  }
  set.default = value
}

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
    let value = config.environment[ key ]
    const set = { env: key }
    if (/^[{{].+[}}]$/.test(value)) {
      set.key = value.replace(/[}{]/g, '')
    } else {
      setDefaultValue(set, value)
    }
    if (config.default && config.default[key]) {
      setDefaultValue(set, config.default[key])
    }
    hash.sets.push(set)
  }

  for (let key in config.argument) {
    let value = config.argument[ key ]
    let set = getSet(hash.sets, value)
    if (!set) {
      set = { env: value }
      hash.sets.push(set)
    }
    set.argument = key
    if (!set.default && config.default && config.default[value]) {
      setDefaultValue(set, config.default[value])
    }
  }
  return hash
}

module.exports = {
  load: load
}
