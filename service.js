const url = require('url')
const debug = require('debug')('mgate:service')
const fsp = require('./utils/fsp')
const circuitbreaker = require('./circuitbreaker')

const rhttp = /^http[s2]?$/

exports.parse = function parse(dir) {
  const modules = fsp.findModules(dir)
  debug('resolved service module files %O', modules)

  const services = modules.reduce((services, { name, module }) => {
    services[name] = module
    return services
  }, {})

  return services
}

exports.fetch = async function fetch(services, protocols, name, options) {
  debug('fetch data from %s', name)
  const service = services[name]
  if (!service) {
    throw new Error(`service ${name} isn't registered`)
  }

  let protocol
  if (rhttp.test(service.protocol)) {
    options.url = url.resolve(service.address, options.pathname)
    options.http2 = service.protocol === 'http2'
    options.protobuf = service.protobuf
    protocol = protocols.http
  }
  else {
    protocol = protocols[service.protocol]
    if (!protocol) {
      throw new Error(`protocol ${service.protocol} isn't supported`)
    }
  }

  if (service.ratelimiting && !service.ratelimiting.acquire()) {
    throw new Error(`too many requests for service ${name}`)
  }

  if (service.circuitbreaker) {
    return await circuitbreaker.call(name, protocol.fetch, options)
  }
  else {
    return await protocol.fetch(options)
  }
}
