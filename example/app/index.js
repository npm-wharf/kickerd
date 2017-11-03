var fs = require('fs')
var express = require('express')
var app = express()
var args = require('yargs')
  .option('greeting-route', {
    default: '/hello',
    description: 'a path to host a json based greeting'
  })
  .option('greeting-message', {
    default: 'hello, world',
    description: 'a message to greet callers with'
  })
  .help()
  .alias('help', 'h')
  .version()
  .argv

var title = process.env.TITLE
var port = process.env.PORT
var motd = process.env.MOTD

process.title = title

console.log(`Starting ${title} at port ${port}`)
console.log(`${motd}`)

app.get('/', (req, res) => {
  res.send(motd)
})

app.get(args.greetingRoute, (req, res) => {
  res.send({ greeting: args.greetingMessage })
})

app.listen(port)

process.on('SIGTERM', () => {
  console.log('shutting down')
  process.exit(0)
})

var cfg = fs.readFileSync('./app.cfg', 'utf8')
console.log(cfg)
