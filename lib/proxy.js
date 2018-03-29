const debug = require('debug')('httproxy:proxy')
const extend = require('./utils/extend')
const emitter = require('./utils/emitter')
const iterator = require('./utils/iterator')
const http = require('./http')
const proxyset = require('./proxyset')

function createContext(client) {
  let context = {
    client: client
  }

  return {
    stack() {
      context.parent  = context.result
      context.request = null
      context.result  = null
      return context
    },
    child() {
      return {
        client: context.client,
        parent: context.result,
        request: null,
        result: null
      }
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
        if (err) {
          next(err)
          return
        }
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

      const proxyMatched = proxyset.lookup(requestObject.url, requestObject.method)

      if (proxyMatched) {
        proxy(Object.assign({}, context.client, requestObject), proxyMatched, done)
      }
      else {
        http(requestObject, (err, result, response) => {
          if (err) {
            emitter.emit('http error', err, requestObject)
          }
          else {
            emitter.emit('http request', response, requestObject)
          }
          done(err, result)
        })
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
      request(context.stack(), options, next)
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
