const express = require('express')
const debug = require('debug')('mgate:index')
const logger = require('./utils/logger')
const protocol = require('./protocol')
const service = require('./service')
const endpoint = require('./endpoint')
const proxy = require('./proxy')
const ratelimiter = require('./ratelimiter')
const circuitbreaker = require('./circuitbreaker')

const ProxyOptionDefaults = {
  logger: null
}

const ServerOptionsDefaults = {
  logger: null,
  middlewares: [],
  port: 4869,
  response(err, data) {
    return {
      error: err ? { message: err.message, stack: err.stack } : null,
      data
    }
  }
}

function getProxyHandler(options) {
  const { logger: loggerOptions } = Object.assign({}, ProxyOptionDefaults, options)

  if (loggerOptions) {
    logger.configure(loggerOptions)
  }

  const protocols = protocol.parse('protocols')
  const services = service.parse('services')
  const endpoints = endpoint.parse('endpoints')

  for (const name in services) {
    if (services[name].ratelimiting) {
      const { qps } = services[name].ratelimiting.qps
      services[name].ratelimiting = ratelimiter.create(qps)
    }
    if (services[name].circuitbreaker) {
      const { monitor, recover, threshold } = services[name].circuitbreaker
      services[name].circuitbreaker = circuitbreaker.create(monitor, recover, threshold)
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
  const { logger: loggerOptions, middlewares, port, response } = Object.assign({}, ServerOptionsDefaults, options)

  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  middlewares.forEach(middleware => app.use(middleware))

  const proxyHandle = getProxyHandler({ logger: loggerOptions })

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

  const server = app.listen(port)

  server.on('listening', () => {
    logger.info(`server running on port ${port}`)
  })

  server.on('error', err => {
    logger.error(err)
  })

  return () => server.close()
}

module.exports = createServer
module.exports.getProxyHandler = getProxyHandler
