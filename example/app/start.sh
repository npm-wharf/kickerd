#!/bin/sh

node_modules/renv/bin/renv.js import ./seed.json
kickerd --environment=development --debug=true --etcd=http://etcd:2379
