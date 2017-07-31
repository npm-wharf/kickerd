#!/bin/sh

furthermore -e development import ./seed.json
kickerd --prefix=development --debug=true --etcd=http://etcd:2379
