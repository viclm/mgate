const fs = require('fs')
const path = require('path')
const debug = require('debug')('httproxy:parse')
const option = require('./util/option')

const rjs = /\.js$/
const rindex = /\/index$/
const rHttpMethod = /^get|head|post|put|delete|connect|options|trace$/
const rwildcard = /\*$/

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
  const index = modules.indexOf(path.join(dir, 'index.js'))
  if (index > -1) {
    modules.splice(index, 1)
    modules.unshift(path.join(dir, 'index.js'))
  }
  return modules.reverse()
}

function resolveRequestOptions(options) {
  if (Array.isArray(options)) {
    return options.map(resolveRequestOptions)
  }
  let results = {}
  results.url = options.url
  results.method = options.method ? options.method.toLowerCase() : 'get'
  results.datatype = options.datatype ? options.datatype.toLowerCase() : undefined
  results.timeout = options.timeout
  results.before = option.wrap(options.before)
  results.after = option.wrap(options.after)
  results.when = option.wrap(options.when)
  if (options.fallback) {
    results.fallback = option.wrap(options.fallback)
  }
  if (options.fake) {
    results.fake = option.wrap(options.fake)
  }
  return results
}

function resolveProxyOptions(options) {
  let results = {}
  results.url = options.url
  results.method = options.method.toLowerCase()
  results.formdata = !!options.formdata
  results.rules = options.rules ? options.rules.map(resolveRequestOptions) : []
  return results
}

module.exports = function init(dir) {
  const modules = resolveProxyModules(dir)
  debug('resolved proxy modules %O', modules)

  let allProxyOptions = []
  let allProxyOptionsCount = 0

  modules.forEach(module => {
    const expts = require(path.resolve(module))
    const url = '/' + module.slice(0, -3).replace(rindex, '/*')

    for (let method in expts) {
      if (!rHttpMethod.test(method)) {
        continue
      }

      const proxyOptions = resolveProxyOptions(Object.assign(expts[method], { url, method }))
      debug('resolved proxy options %O', proxyOptions)

      allProxyOptions.push(proxyOptions)
      allProxyOptionsCount++
    }
  })

  function lookup(url, method) {
    for (let i = 0 ; i < allProxyOptionsCount ; i++) {
      let proxyOptions = allProxyOptions[i]

      if (proxyOptions.method !== method) {
        continue
      }

      if (rwildcard.test(proxyOptions.url) && url.indexOf(proxyOptions.url.slice(0, -2)) === 0) {
        return proxyOptions
      }

      if (proxyOptions.url === url) {
        return proxyOptions
      }
    }
  }

  return new Proxy(allProxyOptions, {
    get(target, name) {
      return name === 'get' ? lookup : target[name]
    }
  })

}
