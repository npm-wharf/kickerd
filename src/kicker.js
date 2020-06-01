const RETRY_TIMEOUT = 5
const CHANGE_TIMEOUT = 10

class Kicker {
  constructor (bootStrap, configMapper, Etcd, log, processHost, writer) {
    this.bootStrap = bootStrap
    this.configMapper = configMapper
    this.Etcd = Etcd
    this.log = log
    this.processHost = processHost
    this.writer = writer
    this.onExit = this.onExit.bind(this)
    this.wait = this.wait.bind(this)
    this.writeFiles = this.writeFiles.bind(this)
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
      return this.processHost.restart(
        this.configuration,
        this.writeFiles,
        this.onExit
      )
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
    this.writeFiles()
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
    return this.processHost.restart(
      this.configuration,
      this.writeFiles,
      this.onExit
    )
      .then(
        () => {
          this.deferredChange.resolve()
          lock.unlock()
        }
      )
  }

  onLockFailed (change, err) {
    const retry = this.configuration.lockTTL || RETRY_TIMEOUT
    if (this.configuration.dontRetry !== true) {
      this.log.error(`Failed to acquire lock, trying again in ${retry} seconds : ${err.message}`)
      setTimeout(() => this.configurationChanged(change), retry * 1000)
    } else {
      this.log.error(`Failed to acquire lock, dontRetry is set to 'true', not retrying : ${err.message}`)
      this.deferredChange.reject(err)
    }
  }

  wait (change) {
    if (change.action === 'ignore') {
      return Promise.resolve({})
    }
    if (this.timeout) {
      this.removeTimeout()
    }
    const timeout = this.configuration.changeWait || CHANGE_TIMEOUT
    this.log.info(`Change detected - waiting for ${timeout} seconds before applying change`)
    this.timeout = setTimeout(() => {
      this.onChange(change)
    }, timeout * 1000)

    this.deferredChange = { resolve: null, reject: null, promise: null }
    this.deferredChange.promise = new Promise((resolve, reject) => {
      this.deferredChange.resolve = () => {
        this.removeTimeout()
        delete this.deferredChange
        resolve()
      }
      this.deferredChange.reject = (e) => {
        this.removeTimeout()
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

  writeFiles () {
    if (this.writer.hasFiles(this.configuration)) {
      this.log.info('writing configuration files to disk')
      return this.writer.writeFiles(this.configuration)
    }
    return Promise.resolve()
  }

  removeTimeout () {
    clearTimeout(this.timeout)
    delete this.timeout
  }
}

module.exports = Kicker
