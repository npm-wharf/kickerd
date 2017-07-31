#!/bin/ash

if [[ -z ${KEY_PREFIX} ]]; then
  export KEY_PREFIX=${NODE_ENV:-production}
fi

kickerd --file=${KICKERFILE:-"./.kicker.toml"} \
        --prefix=$KEY_PREFIX \
        --etcd=${ETCD:-"http://localhost:2379"} \
        --debug=${DEBUG:-false} \
        --lock-restart=${LOCK_RESTART:-true} \
        --lock-ttl=${LOCK_TTL:-5} \
        --change-wait=${CHANGE_WAIT:-10}
