class Definition {
  constructor (env, defaultValue, key, argument, file) {
    this.env = env
    this.values = Array(5)
    this.values[0] = defaultValue
    this.values[1] = process.env[env]
    this.level = this.values[1] != null ? 1 : 0
    this.type = this.getType(defaultValue)
    this.key = key
    this.argument = argument
    this.file = file
  }

  get value () {
    // take the highest precedent value that is not null
    return this.values.reduceRight((v, x) => {
      if (v == null && x !== null) {
        v = x
      }
      return v
    })
  }

  getType (value) {
    let type = 'string'
    if (value === true || value === false || /(true|false)/.test(value)) {
      type = 'boolean'
    } else if (/^-?[0-9]+\.?[0-9]*$/.test(value)) {
      type = 'number'
    }
    return type
  }

  clearValue (level) {
    this.values[level] = null
    while (--level > 0 && this.values[level] == null) {}
    this.level = level
  }

  setValue (value, level) {
    this.type = this.getType(value)
    this.values[level] = value
    if (level > this.level) {
      this.level = level
    }
  }
}

module.exports = Definition
