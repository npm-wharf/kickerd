const fs = require('fs')
const path = require('path')
const toml = require('toml-j0.4')
const packagePath = path.resolve(process.cwd(), './package.json')
const servicePackage = fs.existsSync(packagePath) ? require(packagePath) : {}
const Definition = require('./definition')

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

  const envs = {}

  // traverse environment stanza first
  // then arguments next building up arg sets
  // to make it easy to call constructor on
  // Definition. Multi passes are ok,
  // config sets aren't unbounded and this is
  // on start-up.
  for (let key in config.environment) {
    const value = config.environment[ key ]
    const definition = {}
    if (/^[{{].+[}}]$/.test(value)) {
      definition.key = value.replace(/[}{]/g, '')
    } else {
      definition.default = value
    }
    if (config.default && config.default[key]) {
      definition.default = config.default[key]
    }
    envs[key] = definition
  }

  for (let key in config.argument) {
    let value = config.argument[ key ]
    let definition = envs[ value ]
    if (!definition) {
      definition = {}
      envs[ value ] = definition
    }
    definition.argument = key
    if (!definition.default && config.default && config.default[value]) {
      definition.default = config.default[value]
    }
  }

  for (let key in config.file) {
    let value = config.file[ key ]
    let definition = envs[ value ]
    if (!definition) {
      definition = {}
      envs[ value ] = definition
    }
    definition.file = key
    if (/^[{{].+[}}]$/.test(value)) {
      definition.key = value.replace(/[}{]/g, '')
    } else {
      definition.key = value
    }
  }

  for (let key in envs) {
    const value = envs[ key ]
    const definition = new Definition(key, value.default, value.key, value.argument, value.file)
    hash.sets.push(definition)
  }

  return hash
}

module.exports = {
  load: load
}
