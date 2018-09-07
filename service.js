const fs = require('fs')
const path = require('path')
const protobuf = require('protobufjs')
const debug = require('debug')('mgate:service')

const rjs = /\.js$/
const rhttp = /^http/

function findServiceModules(dir) {
  return fs.readdirSync(dir)
    .map(filename => path.join(dir, filename))
    .reduce((found, filename) => {
      const stat = fs.statSync(filename)
      if (stat.isDirectory()) {
        return found.concat(findServiceModules(filename))
      }
      else if (stat.isFile() && rjs.test(filename)) {
        found.push(filename)
        return found
      }
      return found
    }, [])
}

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
  if (!fs.existsSync(dir)) {
    return {}
  }

  dir = path.resolve(dir)
  const modules = findServiceModules(dir)
  debug('resolved service modules %O', modules)

  const services = modules.reduce((obj, filename) => {
    const name = path.basename(filename, '.js')
    const service = require(filename)
    debug('resolved service %O', service)
    if (service.idl && rhttp.test(service.protocol)) {
      service.verify = loadProtobuf(service.idl)
    }
    obj[name] = service
    return obj
  }, {})

  return services
}

exports.fetch = async function fetch(services, name, options) {
  debug('fetch data from %s', name)
  if (name === 'fake') {
    return null
  }

  const service = services[name]
  if (!service) {
    throw new Error(`service ${name} isn't registered`)
  }
  options.service = service

  let result

  switch (service.protocol) {
    case 'http':
    case 'https':
      result = await require('./protocols/http').fetch(options)
      break
    case 'http2':
      result = await require('./protocols/http2').fetch(options)
      break
    case 'grpc':
      result = await require('./protocols/grpc').fetch(options)
      break
    default:
      throw new Error(`${service.protocol} protocol isn't supported`)
  }

  return result
}
