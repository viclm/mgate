const express = require('express')
const debug = require('debug')('mgate:index')
const logger = require('./utils/logger')
const func = require('./utils/func')
const protocol = require('./protocol')
const service = require('./service')
const endpoint = require('./endpoint')
const proxy = require('./proxy')
const ratelimiting = require('./ratelimiting')
const circuitbreaker = require('./circuitbreaker')

const defaults = {
  port: 4869,
  logger: null,
  middlewares: [],
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

module.exports = function createServer(options) {
  options = Object.assign({}, defaults, options)

  if (options.logger) {
    logger.configure(options.logger)
  }

  const protocols = protocol.parse('protocols')
  const services = service.parse('services')
  const endpoints = endpoint.parse('endpoints')

  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  options.middlewares.forEach(middleware => app.use(middleware))

  app.use(createProxyRouter(endpoints, { services, protocols }))

  app.use((req, res, next) => {
    if (res.locals.proxy) {
      const [ data, err ] = res.locals.proxy
      if (err) {
        logger.error(err)
      }
      res.json(options.response.call(null, err, data))
    }
    else {
      res.status(404).end()
    }
  })

  for (const name in services) {
    if (services[name].ratelimiting) {
      ratelimiting.init(name, services[name].ratelimiting)
    }
    if (services[name].circuitbreaker) {
      circuitbreaker.init(name, services[name].circuitbreaker)
    }
  }

  const server = app.listen(options.port)

  server.on('listening', () => {
    logger.info(`server running on port ${options.port}`)
  })

  server.on('error', err => {
    logger.error(err)
  })

  return () => server.close()
}
