const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const debug = require('debug')('httproxy:index')
const emitter = require('./utils/emitter')
const proxyset = require('./proxyset')
const proxy = require('./proxy')

const rjs = /\.js$/
const rindex = /\/index$/
const rHttpMethod = /^get|head|post|put|delete|connect|options|trace$/

const defaults = {
  path: 'api',
  formdata: false
}

function resolveProxyModules(dir) {
  let modules = []
  fs.readdirSync(dir).forEach(filename => {
    filename = path.join(dir, filename)
    const stat = fs.statSync(filename)
    if (stat.isDirectory(filename)) {
      modules = modules.concat(resolveProxyModules(filename))
    }
    else if (stat.isFile() && rjs.test(filename)) {
      modules.push(filename)
    }
  })
  let index = modules.indexOf(path.join(dir, 'index.js'))
  if (index > -1) {
    modules.splice(index, 1)
    modules.unshift(path.join(dir, 'index.js'))
  }
  return modules.reverse()
}

function resolveFunction(fn) {
  return function (context, result, callback) {
    let ret
    if (fn) {
      try {
        ret = fn(context, result)
      }
      catch (err) {
        callback(err)
        return
      }
    }
    else {
      ret = result
    }

    if (typeof ret.then === 'function' && ret.then.length === 2) {
      ret.then(r => {
        callback(null, r)
      }, callback)
    }
    else {
      callback(null, ret)
    }
  }
}

function resolveRequestOptions(options) {
  let results = {}
  results.key = options.key
  results.url = options.url
  results.method = options.method ? options.method.toLowerCase() : 'get'
  results.datatype = options.datatype ? options.datatype.toLowerCase() : undefined
  results.before = resolveFunction(options.before)
  results.after = resolveFunction(options.after)
  results.when = resolveFunction(options.when)
  if (options.fake) {
    results.fake = resolveFunction(options.fake)
  }
  return results
}

function resolveProxyOptions(options) {
  let results = {}
  results.url = options.url
  results.method = options.method.toLowerCase()
  results.after = resolveFunction(options.after)
  if (options.serial) {
    if (options.serial.length === 0) {
      throw new Error(`${options.url}:${options.method} option serial is empty`)
    }
    results.serial = options.serial.map(resolveRequestOptions)
  }
  else if (options.parallel) {
    if (options.parallel.length === 0) {
      throw new Error(`${options.url}:${options.method} option parallel is empty`)
    }
    results.parallel = options.parallel.map(resolveRequestOptions)
  }
  else {
    throw new Error(`${options.url}:${options.method} doesn't have a serial or parallel option`)
  }
  return results
}

module.exports = function httproxy(options) {
  options = Object.assign({}, defaults, options)
  debug('options %O', options)

  const modules = resolveProxyModules(options.path)
  debug('resolved proxy modules %O', modules)

  const handle = (req, res, next) => {
    const url = req.path
    const method = req.method.toLowerCase()
    const proxyOptions = proxyset.lookup(url, method)

    proxy({
      url: url,
      method: method,
      headers: req.headers,
      data: method === 'get' ? req.query : req.body,
    }, proxyOptions, (err, result) => {
      if (err) {
        emitter.emit('error', err)
        next(err)
      }
      else {
        res.json(result)
      }
    })
  }

  const router = new express.Router

  if (options.formdata) {
    const upload = multer()
  }

  modules.forEach(module => {
    const expts = require(path.resolve(module))
    const url = '/' + module.slice(0, -3).replace(rindex, '/*')
    const route = router.route(url)

    for (let method in expts) {
      if (!rHttpMethod.test(method)) {
        continue
      }

      const proxyOptions = resolveProxyOptions(Object.assign(expts[method], { url, method }))
      debug('resolved proxy options %O', proxyOptions)

      if (options.formdata) {
        route[method](upload.any(), handle)
      }
      else {
        route[method](handle)
      }

      proxyset.add(proxyOptions)
    }
  })

  return new Proxy([express.json(), express.urlencoded({ extended: true }), router], {
    get(target, name) {
      return name in target ? target[name] : emitter[name]
    }
  })
}
