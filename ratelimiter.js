const debug = require('debug')('mgate:ratelimiter')

class RateLimiter {
  constructor(permitsPerSecond, maxBurstSeconds = 1) {
    this.permitsPerSecond = permitsPerSecond
    this.stableIntervalMicros = 1000 / permitsPerSecond
    this.maxPermits = permitsPerSecond * maxBurstSeconds
    this.storedPermits = 0
    this.nextFreeTicketMicros = Date.now()
  }

  resync(nowMicros) {
    if (nowMicros > this.nextFreeTicketMicros) {
      debug('resync to now')
      this.storedPermits = Math.min(this.maxPermits, this.storedPermits + (nowMicros - this.nextFreeTicketMicros) / this.stableIntervalMicros)
      this.nextFreeTicketMicros = nowMicros
    }
  }

  acquire(permits = 1) {
    const nowMicros = Date.now()
    if (nowMicros < this.nextFreeTicketMicros) { return false }
    this.resync(nowMicros)
    if (permits <= this.storedPermits) {
      this.storedPermits -= permits
    }
    else {
      debug('acquire ahead of time')
      const freshPermits = permits - this.storedPermits
      this.storedPermits = 0
      this.nextFreeTicketMicros += this.stableIntervalMicros * freshPermits
    }
    return true
  }
}

exports.RateLimiter = RateLimiter

exports.create = function create() {
  return new RateLimiter(...arguments)
}
