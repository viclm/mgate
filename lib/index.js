const debug = require('debug')('httproxy:index')
const emitter = require('./util/emitter')
const config = require('./config')
const parse = require('./parse')
const proxy = require('./proxy')
const server = require('./server')

exports.config = function _config(options) {
  if (typeof options.rules === 'string') {
    options.rules = parse(options.rules)
  }
  config.set(options)
}

exports.on = function _on(event, handler) {
  emitter.on(event, handler)
}

exports.proxy = function _proxy(graph, requestdata = {}) {
  return new Promise((resolve, reject) => {
    proxy(requestdata, graph, (err, result) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(result)
      }
    })
  })
}

exports.request = function _request(path, method, requestdata = {}) {
  const graph = config.rule(req.path, method)
  if (!graph) {
    return Promise.reject(new Error(`no rule for ${method} ${path}`))
  }

  return exports.proxy(requestdata, graph)
}

exports.serve = server
