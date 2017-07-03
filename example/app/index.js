var express = require('express')
var app = express()

var title = process.env.TITLE
var port = process.env.PORT
var motd = process.env.MOTD

process.title = title

app.get('/', (req, res) => {
  res.send(motd)
})
app.listen(port)
