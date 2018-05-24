const debug = require('debug')('httproxy:proxy')
const emitter = require('./util/emitter')
const iterator = require('./util/iterator')
const config = require('./config')
const http = require('./http')
const circuitbreaker = require('./circuitbreaker')

function createContext(client) {
  let stack = []

  function createLayer() {
    return {
      client: client,
      parent: stack.length ? stack[stack.length - 1].result : null,
      request: null,
      result: null
    }
  }

  return {
    back() {
      stack.pop()
    },
    stack() {
      const layer = createLayer()
      stack.push(layer)
      return layer
    },
    child() {
      return createLayer()
    }
  }
}

function httpWrapper(options, callback) {
  const noop = () => {}
  const circuitbreakerOpenning = config.get('circuitbreaker')
  const cbr = new Proxy(circuitbreaker, {
    get(target, name) {
      return circuitbreakerOpenning ? target[name] : noop
    }
  })
  const uri = options.url + '#' + options.method
  if (cbr.check(uri)) {
    callback(new Error('circuit break'))
  }
  else {
    http(options, (err, result, response, request) => {
      if (err) {
        cbr.monitor(uri)
        cbr.record(uri, false)
        emitter.emit('http error', err, result)
      }
      else {
        cbr.record(uri, true)
        emitter.emit('http request', response, request)
      }
      callback(err, result)
    })
  }
}

function request(options, context, allProxyOptions, next) {
  debug('proxy request %O', options)
  options.when(context, true, (err, r) => {
    if (err) {
      next(err)
      return
    }

    if (!r) {
      next()
      return
    }

    if (options.fake) {
      options.fake(context, null, (err, r) => {
        if (err) {
          next(err)
        }
        else {
          context.result = r
          next()
        }
      })
      return
    }

    let requestObject = {
      url: options.url,
      method: options.method,
      timeout: options.timeout,
      datatype: options.datatype,
      data: context.client.data
    }

    context.request = requestObject

    options.before(context, requestObject, (err, r) => {
      if (err) {
        next(err)
        return
      }

      Object.assign(requestObject, r)

      const done = (err, result) => {
        if (err && !options.fallback) {
          next(err)
        }
        else if (err) {
          options.fallback(context, null, (err, r) => {
            if (err) {
              next(err)
            }
            else {
              context.result = r
              next()
            }
          })
        }
        else {
          context.result = result
          options.after(context, result, (err, r) => {
            if (err) {
              next(err)
            }
            else {
              context.result = r
              next()
            }
          })
        }
      }

      const proxyMatched = allProxyOptions.get(requestObject.url, requestObject.method)

      if (proxyMatched) {
        proxy(requestObject, proxyMatched, allProxyOptions, done)
      }
      else {
        httpWrapper(requestObject, done)
      }

    })
  })
}

module.exports = function proxy(requestOptions, proxyOptions, allProxyOptions, callback) {
  debug('proxy request %O', requestOptions)
  const context = createContext(requestOptions)

  iterator.serial(proxyOptions.rules, (options, index, next) => {
    if (Array.isArray(options)) {
      let ctxs = []
      iterator.parallel(options, (o, i, n) => {
        request(o, ctxs[i] = context.child(), allProxyOptions, n)
      }, err => {
        if (err) {
          next(err)
        }
        else {
          let ctx = context.stack()
          ctx.result = ctxs.map(c => c.result)
          next()
        }
      })
    }
    else {
      request(options, context.stack(), allProxyOptions, err => {
        if (err) {
          next(err)
        }
        else {
          const ctx = context.child()
          if (ctx.parent === null) {
            context.back()
          }
          next()
        }
      })
    }
  }, err => {
    if (err) {
      callback(err)
    }
    else {
      const ctx = context.child()
      if (ctx.parent) {
        callback(null, ctx.parent)
      }
      else {
        callback(new Error('empty request'))
      }
    }
  })

}
