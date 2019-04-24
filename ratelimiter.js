const debug = require('debug')('mgate:ratelimiter')

class RateLimiter {
  constructor(permitsPerSecond, maxBurstSeconds) {
    this.permitsPerSecond = permitsPerSecond
    this.maxPermits = permitsPerSecond * maxBurstSeconds
    this.storedPermits = 0
    this.nextFreeTicketMicros = Date.now()
  }

  resync(nowMicros) {
    if (nowMicros > this.nextFreeTicketMicros) {
      debug('resync to now')
      this.storedPermits = Math.min(this.maxPermits, this.storedPermits + (nowMicros - this.nextFreeTicketMicros) / (1 / this.permitsPerSecond * 1000))
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
      this.nextFreeTicketMicros += (1 / this.permitsPerSecond * 1000) * freshPermits
    }
    return true
  }
}

exports.RateLimiter = RateLimiter

exports.create = function create(permitsPerSecond, maxBurstSeconds = 1) {
  return new RateLimiter(permitsPerSecond, maxBurstSeconds)
}
