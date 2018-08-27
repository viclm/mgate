const debug = require('debug')('mgate:circuitbreaker')
const timer = require('./utils/timer')

const STATUS_OPEN = 'open'
const STATUS_HARFOPEN = 'harfopen'
const STATUS_CLOSE = 'close'

const Poll = {
  entries: {},
  limit: 1000,
  get(key) {
    return this.entries[key]
  },
  set(key, value) {
    if (this.limit > 0) {
      this.entries[key] = value
    }
  },
  del(key) {
    delete this.entries[key]
  }
}

exports.monitor = function (uri) {
  if (Poll.get(uri)) {
    return
  }
  debug('monitoring for %s', uri)

  let stat = {
    status: STATUS_CLOSE,
  }

  const run = () => {
    stat.success = 0
    stat.failuire = 0
    timer.delay(10, () => {
      if (stat.failuire > stat.success) {
        debug('open for %s', uri)
        stat.status = STATUS_OPEN
        timer.delay(5, () => {
          debug('harlopen for %s', uri)
          stat.status = STATUS_HARFOPEN
          run()
        })
      }
      else {
        debug('close for %s', uri)
        Poll.del(uri)
      }
    })
  }

  Poll.set(uri, stat)

  run()
}

exports.record = function (uri, isOk) {
  let stat = Poll.get(uri)
  if (stat) {
    if (isOk) {
      stat.success++
    }
    else {
      stat.failuire++
    }
  }
}

exports.check = function (uri) {
  let stat = Poll.get(uri)
  let ret = false
  if (stat) {
    if (stat.status === STATUS_OPEN) {
      ret = true
    }
    else if (stat.status === STATUS_HARFOPEN) {
      ret = Math.random() > 0.5
    }
  }
  return ret
}

exports.stat = function (uri) {
  return Poll.get(uri)
}
