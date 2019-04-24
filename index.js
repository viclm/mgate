const express = require('express')
const debug = require('debug')('mgate:index')
const logger = require('./utils/logger')
const protocol = require('./protocol')
const service = require('./service')
const endpoint = require('./endpoint')
const proxy = require('./proxy')
const ratelimiter = require('./ratelimiter')
const circuitbreaker = require('./circuitbreaker')

const defaults = {
  port: 4869,
  logger: null,
  middlewares: [],
  response(err, data) {
    return {
      error: err ? { message: err.message, stack: err.stack } : null,
      data: data
    }
  },
}

function getProxyHandler(options) {
  options = Object.assign({}, defaults, options)

  if (options.logger) {
    logger.configure(options.logger)
  }

  const protocols = protocol.parse('protocols')
  const services = service.parse('services')
  const endpoints = endpoint.parse('endpoints')

  for (const name in services) {
    if (services[name].ratelimiting) {
      services[name].ratelimiting = ratelimiter.create(services[name].ratelimiting.qps)
    }
    if (services[name].circuitbreaker) {
      circuitbreaker.init(name, services[name].circuitbreaker)
    }
  }

  return async function handle(req) {
    for (let rule of endpoints) {
      if (rule.path.test(req.path) && rule.method === req.method.toLowerCase()) {
        return await proxy.proxy(rule.graph, { request: req, services, protocols })
      }
    }
    throw new Error('do not match any endpoint')
  }
}

function createServer(options) {
  options = Object.assign({}, defaults, options)

  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  options.middlewares.forEach(middleware => app.use(middleware))

  const proxyHandle = getProxyHandler({ logger: options.logger })
  const response = options.response

  app.use((req, res, next) => {
    proxyHandle(req)
    .then(json => {
      res.json(response(null, json))
    })
    .catch(err => {
      res.json(response(err))
      logger.error(err)
    })
  })

  const server = app.listen(options.port)

  server.on('listening', () => {
    logger.info(`server running on port ${options.port}`)
  })

  server.on('error', err => {
    logger.error(err)
  })

  return () => server.close()
}

module.exports = createServer
module.exports.getProxyHandler = getProxyHandler
