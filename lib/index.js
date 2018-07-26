const debug = require('debug')('httproxy:index')
const proxy = require('./proxy')
const createServer = require('./server')

const globals = {}

exports.config = function exportsConfig(options) {
  Object.assign(globals, options)
}

exports.proxy = function exportsProxy(graph, options) {
  return new Promise((resolve, reject) => {
    proxy(graph, Object.assign({}, globals, options), (err, result) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(result)
      }
    })
  })
}

exports.createServer = createServer
