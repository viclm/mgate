const url = require('url')
const debug = require('debug')('mgate:service')
const fsp = require('./utils/fsp')
const circuitbreaker = require('./circuitbreaker')

const rhttp = /^http[s2]?$/

exports.parse = function parse(dirname) {
  const modules = fsp.findModules(dirname)
  debug('resolved service module files %O', modules)

  return modules.reduce((services, { name, module }) => {
    services[name] = module
    return services
  }, {})
}

exports.fetch = async function fetch(protocols, services, serviceName, fetchOptions) {
  debug('fetch data from %s', serviceName)
  if (!(serviceName in services)) {
    throw new Error(`service ${serviceName} isn't registered`)
  }

  const {
    protocol: protocolName,
    protobuf: protoFileName,
    address,
    ratelimiting,
    circuitbreaker
  } = services[serviceName]

  let fetchFn
  if (rhttp.test(protocolName)) {
    fetchOptions.url = url.resolve(address, fetchOptions.pathname)
    fetchOptions.http2 = protocolName === 'http2'
    fetchOptions.protobuf = protoFileName
    fetchFn = protocols.http.fetch
  }
  else if (protocolName in protocols) {
    fetchFn = protocols[protocolName].fetch
  }
  else {
    throw new Error(`protocol ${protocolName} isn't supported`)
  }

  if (ratelimiting && !ratelimiting.acquire()) {
    throw new Error(`too many requests for service ${serviceName}`)
  }

  return circuitbreaker ? await circuitbreaker.call(fetchFn, fetchOptions) : await fetchFn(fetchOptions)
}
