const RETRY_TIMEOUT = 5
const CHANGE_TIMEOUT = 10

class Kicker {
  constructor (bootStrap, configMapper, Etcd, log, processHost) {
    this.bootStrap = bootStrap
    this.configMapper = configMapper
    this.Etcd = Etcd
    this.log = log
    this.processHost = processHost
    this.wait = this.wait.bind(this)
    this.onExit = this.onExit.bind(this)
  }

  configurationChanged (change) {
    if (this.configuration.lockRestart) {
      const lock = this.etcd.lockRestart(this.configuration)
      this.log.info('Acquiring restart lock')
      return lock.lock()
        .then(
          () => this.onLock(lock),
          this.onLockFailed.bind(this, change)
        )
    } else {
      return this.processHost.restart(this.configuration, this.onExit)
        .then(() => {
          this.deferredChange.resolve()
        })
    }
  }

  hostProcess () {
    this.log.info('Starting service')
    this.processHost.start(this.configuration, this.onExit)
    this.watch()
    return Promise.resolve()
  }

  initProcess () {
    this.logConfiguration()
    if (this.configuration.bootstrap) {
      return this.writeBootStrap()
    } else {
      return this.hostProcess()
    }
  }

  kick (args) {
    this.configuration = this.configMapper.load(args.file)
    Object.assign(this.configuration, args)
    this.etcd = this.Etcd({ url: this.configuration.etcd })
    this.log.info(`Fetching configuration from etcd for key space '${this.configuration.prefix}'`)
    return this.etcd.fetchConfig(this.configuration)
      .then(
        () => this.initProcess(),
        error => this.onError(error)
      )
  }

  logConfiguration () {
    this.log.debug('Configuration (application state)')
    this.log.debug(this.configuration)
  }

  onChange (change) {
    this.log.info(`Configuration change detected on key '${change.node.key}'`)
    return this.configurationChanged(change)
  }

  onExit () {
    this.log.info('Hosted service quit unexpectedly - exiting')
    process.exit(100)
  }

  onError (error) {
    this.log.error(`Error retrieving keys for key space '${this.configuration.prefix}' from etcd '${this.configuration.etcd}': ${error.message}`)
    process.exit(100)
  }

  onLock (lock) {
    this.log.info('Restart lock acquired successfully')
    this.logConfiguration(this.configuration)
    return this.processHost.restart(this.configuration, this.onExit)
      .then(
        () => {
          this.deferredChange.resolve()
          lock.unlock()
        }
      )
  }

  onLockFailed (change, err) {
    const retry = this.configuration.lockTTL || RETRY_TIMEOUT
    this.log.error(`Failed to acquire lock, trying again in ${retry} seconds : ${err.message}`)
    if (this.configuration.dontRetry !== true) {
      setTimeout(() => this.configurationChanged(change), retry * 1000)
    } else {
      this.deferredChange.reject(err)
    }
  }

  wait (change) {
    if (change.action === 'ignore') {
      return Promise.resolve({})
    }
    if (this.timeout) {
      clearTimeout(this.timeout)
      delete this.timeout
    }
    const timeout = this.configuration.changeWait || CHANGE_TIMEOUT
    this.log.info(`Change detected - waiting for ${timeout} seconds before applying change`)
    this.timeout = setTimeout(() => {
      this.onChange(change)
    }, timeout * 1000)

    this.deferredChange = { resolve: null, reject: null, promise: null }
    this.deferredChange.promise = new Promise((resolve, reject) => {
      this.deferredChange.resolve = () => {
        delete this.timeout
        delete this.deferredChange
        resolve()
      }
      this.deferredChange.reject = (e) => {
        delete this.timeout
        delete this.deferredChange
        reject(e)
      }
    })
    return this.deferredChange.promise
  }

  watch () {
    this.etcd.watch(this.configuration, this.wait)
  }

  writeBootStrap () {
    return this.bootStrap.generate(this.configuration)
      .then(
        () => {
          this.log.info('bootstrap file generated successfully')
        }
      )
  }
}

module.exports = Kicker
