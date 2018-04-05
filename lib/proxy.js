const debug = require('debug')('httproxy:proxy')
const emitter = require('./util/emitter')
const iterator = require('./util/iterator')
const setting = require('./setting')
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

function request(context, options, next) {
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

      const proxyMatched = setting.getProxyOptions(requestObject.url, requestObject.method)

      if (proxyMatched) {
        proxy(Object.assign({}, context.client, requestObject), proxyMatched, done)
      }
      else {
        const uri = requestObject.url + '#' + requestObject.method
        if (setting.circuitbreaker && circuitbreaker.check(uri)) {
          done(new Error('circuit break'))
        }
        else {
          http(requestObject, (err, result, response) => {
            if (err) {
              if (setting.circuitbreaker) {
                circuitbreaker.monitor(uri)
                circuitbreaker.record(uri, false)
              }
              emitter.emit('http error', err, requestObject)
            }
            else {
              if (setting.circuitbreaker) {
                circuitbreaker.record(uri, true)
              }
              emitter.emit('http request', response, requestObject)
            }
            done(err, result)
          })
        }
      }

    })
  })
}

module.exports = function proxy(initRequestObject, options, callback) {
  debug('proxy request %O', initRequestObject)
  const context = createContext(initRequestObject)

  iterator.serial(options.rules, (options, index, next) => {
    if (Array.isArray(options)) {
      let ctxs = []
      iterator.parallel(options, (o, i, n) => {
        request(ctxs[i] = context.child(), o, n)
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
      request(context.stack(), options, err => {
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
