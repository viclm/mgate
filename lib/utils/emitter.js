const EventEmitter = require('events')

class Emitter extends EventEmitter {}

const emitter = new Emitter

emitter.on('error', function (err) {
  console.error(err.stack)
})

module.exports = emitter
