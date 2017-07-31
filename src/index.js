const bole = require('bole')
const log = bole('kickerd')
const bootStrap = require('./bootstrap-template')
const configMapper = require('./config-mapper')
const etcdFn = require('./etcd')
const processHost = require('./process-host')
const Kicker = require('./kicker')
const kicker = new Kicker(bootStrap, configMapper, etcdFn, log, processHost)

module.exports = kicker
