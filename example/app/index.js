var express = require('express')
var app = express()

var title = process.env.TITLE
var port = process.env.PORT
var motd = process.env.MOTD

process.title = title

console.log(`Starting ${title} at port ${port}`)
console.log(`${motd}`)

app.get('/', (req, res) => {
  res.send(motd)
})
app.listen(port)

process.on('SIGTERM', () => {
  console.log('shutting down')
  process.exit(0)
})
