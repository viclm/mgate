const debug = require('debug')('httproxy:index')
const config = require('./config')
const proxy = require('./proxy')

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
