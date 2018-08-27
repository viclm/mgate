const EventEmitter = require('events')

class Emitter extends EventEmitter {}

const emitter = new Emitter

emitter.setMaxListeners(Infinity)

module.exports = emitter
