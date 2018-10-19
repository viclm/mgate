const debug = require('debug')('mgate:circuitbreaker')
const timer = require('./utils/timer')

const STATE_OPEN = 'open'
const STATE_HARFOPEN = 'harfopen'
const STATE_CLOSE = 'close'

class CircuitBreaker {
  constructor(options = {}) {
    this.monitorTimeout = options.monitorTimeout || 10
    this.recoverTimeout = options.recoverTimeout || 5
    this.failureThreshold = options.failureThreshold || 0.5

    this.state = STATE_CLOSE
    this.monitoring = false
    this.successCount = 0
    this.failureCount = 0
    this.overallCount = 0
  }

  async call(action, ...args) {
    this.overallCount++
    if (this.state === STATE_OPEN
      || this.state === STATE_HARFOPEN && this.overallCount % 5 !== 1) {
      throw new Error('circuit breaker')
    }

    let ret
    try {
      ret = await action(...args)
    }
    catch (err) {
      this.record(false)
      throw err
    }
    this.record(true)
    return ret
  }

  monitor() {
    if (this.monitoring) {
      return
    }

    const run = () => {
      debug('monitoring')
      this.monitoring = true
      this.successCount = 0
      this.failureCount = 0
      this.overallCount = 0
      timer.delay(this.monitorTimeout, () => {
        this.monitoring = false
        if (this.failureCount / (this.successCount + this.failureCount) >= this.failureThreshold) {
          debug('open')
          this.state = STATE_OPEN
          timer.delay(this.recoverTimeout, () => {
            debug('halfopen')
            this.state = STATE_HARFOPEN
            run()
          })
        }
        else {
          debug('close')
          this.state = STATE_CLOSE
        }
      })
    }

    run()
  }

  record(success) {
    this.monitor()
    if (success) {
      this.successCount++
    }
    else {
      this.failureCount++
    }
  }
}

const Poll = {}

exports.CircuitBreaker = CircuitBreaker

exports.init = function init(name, options) {
  Poll[name] = new CircuitBreaker(options)
}

exports.call = async function call(name, action, ...args) {
  return await Poll[name].call(action, ...args)
}
