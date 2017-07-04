#!/bin/sh

docker run -d --name etcd \
    -p 2379:2379 \
    -p 2380:2380 \
    appcelerator/etcd:3.1.9
