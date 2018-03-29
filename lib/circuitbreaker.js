const debug = require('debug')('httproxy:circuitbreaker')

const STATUS_OPEN = 'open'
const STATUS_HARFOPEN = 'harfopen'
const STATUS_CLOSE = 'close'

const Timer = {
  id: null,
  tasks: [],
  tick() {
    if (this.id) {
      return
    }
    this.id = setInterval(this.run.bind(this), 1000)
  },
  stop() {
    if (this.id) {
      clearInterval(this.id)
      this.id = null
    }
  },
  run() {
    for (let i = 0 ; i < this.tasks.length ; i++) {
      let task = this.tasks[i]
      task.remain--
      if (task.remain === 0) {
        task.callback.call()
        this.tasks.splice(i, 1)
        i--
      }
    }
    if (this.tasks.length === 0) {
      this.stop()
    }
  },
  delay(seconds, callback) {
    this.tasks.push({
      remain: seconds,
      callback
    })
    this.tick()
  }
}

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
    Timer.delay(10, () => {
      if (stat.failuire > stat.success) {
        debug('open for %s', uri)
        stat.status = STATUS_OPEN
        Timer.delay(5, () => {
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
