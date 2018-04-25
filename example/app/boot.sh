#!/bin/sh

furthermore -e development import ./seed.json
kickerd --prefix=development --debug=true --etcd=http://kickerd-etcd:12379 --bootstrap=true
./bootstrap.sh
