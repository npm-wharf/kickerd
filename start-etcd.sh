#!/bin/sh

docker run -d --name kickerd-etcd \
    -p 12379:2379 \
    -p 12380:2380 \
    appcelerator/etcd:3.1.9
