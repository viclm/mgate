const express = require('express')
const debug = require('debug')('mgate:index')
const logger = require('./utils/logger')
const func = require('./utils/func')
const service = require('./service')
const endpoint = require('./endpoint')
const proxy = require('./proxy')

const defaults = {
  port: 4869,
  skipnull: true,
  logger: null,
  response(err, data) {
    return {
      error: err ? { message: err.message } : null,
      data: data
    }
  },
}

function createProxyRouter(endpoints, options) {
  const router = new express.Router

  endpoints.forEach(rule => {
    debug('endpoint router, path: %s, method: %s', rule.path, rule.method)
    router[rule.method](rule.path, async (req, res, next) => {
      res.locals.proxy = await func.multiple(proxy.proxy, rule.graph, Object.assign({ request: req }, options))
      next('router')
    })
  })

  return router
}

class Server {
  constructor(options) {
    this.options = options

    if (options.logger) {
      logger.configure(options.logger)
    }

    this.app = express()
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    this.services = service.parse('services')
    this.endpoints = endpoint.parse('endpoints')
  }

  use() {
    this.app.use(...arguments)
  }

  on() {
    this.app.on(...arguments)
  }

  start() {
    const { options, app } = this

    app.use(createProxyRouter(this.endpoints, {
      services: this.services,
      skipnull: options.skipnull
    }))

    app.use((req, res, next) => {
      if (res.locals.proxy) {
        const [ data, err ] = res.locals.proxy
        if (err) {
          app.emit('error', err)
        }
        res.json(options.response.call(null, err, data))
      }
      else {
        res.status(404).end()
      }
    })

    const server = app.listen(options.port)

    server.on('listening', () => {
      debug('server running on port %d', options.port)
      app.emit('listening')
    })

    server.on('error', err => {
      debug('server start fatal: %s', err.message)
      app.emit('error', err)
    })

    this.stop = () => server.close()
  }
}

module.exports = function createServer(options) {
  options = Object.assign({}, defaults, options)
  return new Server(options)
}
