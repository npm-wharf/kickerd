const fs = require('fs')
const path = require('path')
const nunjucks = require('nunjucks')
const templateSource = fs.readFileSync(path.resolve(__dirname, './bootstrap.sh.tmpl'), 'utf8')
const template = nunjucks.compile(templateSource)
const FILENAME = 'bootstrap.sh'
const FILEPATH = path.resolve(process.cwd(), FILENAME)

function transform (context) {
  return template.render(context)
}

function generate (context) {
  try {
    const output = transform(context)
    fs.writeFileSync(FILEPATH, output, { encoding: 'utf8', mode: 0o777 })
  } catch (err) {
    console.log(`Failed to write ${FILEPATH}: ${err.message}`)
  }
}

module.exports = {
  generate: generate,
  transform: transform
}
