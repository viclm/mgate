const protobuf = require('protobufjs')
const debug = require('debug')('mgate:service')
const func = require('./utils/func')
const fsp = require('./utils/fsp')
const ratelimiting = require('./ratelimiting')
const circuitbreaker = require('./circuitbreaker')

const rhttp = /^http[s2]?$/

function loadProtobuf(path) {
  const lookup = (obj, type, parentName) => {
    let result = []
    let fullname = parentName + obj.name
    if (obj instanceof type) {
      result.push([fullname, obj])
    }
    if (obj.hasOwnProperty('nested')) {
      result = obj.nestedArray.reduce((arr, child) => {
        return arr.concat(lookup(child, type, fullname + '.'))
      }, result)
    }
    return result
  }

  const root = protobuf.loadSync(path)
  const namespace = root.nestedArray[0]
  const services = lookup(namespace, protobuf.Service, '')
  const types = lookup(namespace, protobuf.Type, '').reduce((obj, item) => {
    obj[item[0]] = item[1]
    return obj
  }, {})

  const resolved = services.reduce((obj, item) => {
    const [name, service] = item
    for (let name in service.methods) {
      const requestType  = types[namespace.name + '.' + service.methods[name].requestType]
      const responseType  = types[namespace.name + '.' + service.methods[name].responseType]
      obj[name] = {
        request: payload => requestType.verify(payload),
        response: result => responseType.verify(result),
      }
    }
    return obj
  }, {})

  return resolved
}

exports.parse = function parse(dir) {
  const modules = fsp.findModules(dir)
  debug('resolved service module files %O', modules)

  const services = modules.reduce((accumulator, { name, module }) => {
    if (module.idl && rhttp.test(module.protocol)) {
      module.verify = loadProtobuf(module.idl)
    }
    accumulator[name] = module
    return accumulator
  }, {})

  return services
}

exports.fetch = async function fetch(services, protocols, name, options) {
  debug('fetch data from %s', name)
  const service = services[name]
  if (!service) {
    throw new Error(`service ${name} isn't registered`)
  }
  options.service = service

  let protocol = protocols[rhttp.test(service.protocol) ? 'http' : service.protocol]

  if (!protocol) {
    throw new Error(`protocol ${service.protocol} isn't supported`)
  }

  if (service.ratelimiting && !ratelimiting.consume(name)) {
    throw new Error(`too many requests for service ${name}`)
  }

  if (service.circuitbreaker) {
    return await circuitbreaker.call(name, protocol.fetch, options)
  }
  else {
    return await protocol.fetch(options)
  }

}
