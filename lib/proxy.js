const debug = require('debug')('httproxy:proxy')
const extend = require('./utils/extend')
const emitter = require('./utils/emitter')
const iterator = require('./utils/iterator')
const http = require('./http')
const proxyset = require('./proxyset')

function createContext() {
  let context = {}
  return new Proxy({
    clone() {
      return extend({}, context)
    }
  }, {
    get(target, name) {
      return name === 'clone' ? target[name] : context[name]
    },
    set(target, name, request) {
      context[name] = request
      return true
    }
  })
}

module.exports = function proxy(initRequestObject, options, callback) {
  debug('proxy request %O', initRequestObject)
  const context = createContext()
  context.__init = initRequestObject
  context.__all = []

  let iterSerial, iterFn, iterEntry
  if (options.serial) {
    iterSerial = true
    iterFn = iterator.serial
    iterEntry = options.serial
  }
  else {
    iterSerial = false
    iterFn = iterator.parallel
    iterEntry = options.parallel
  }

  iterFn(iterEntry, (options, index, next) => {
    debug('%s iterator %O', iterSerial ? 'serial' : 'parallel', options)
    options.when(context.clone(), true, (err, r) => {
      if (err) {
        next(err)
        return
      }

      if (!r) {
        next()
        return
      }

      const addContext = (requestObject) => {
        context.__all.push(requestObject)
        if (options.key) {
          context[options.key] = requestObject
        }
        if (iterSerial) {
          context.__last = requestObject
        }
      }

      if (options.fake) {
        options.fake(context.clone(), null, (err, r) => {
          if (err) {
            next(err)
          }
          else {
            addContext({ result: r })
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
        data: initRequestObject.data
      }

      options.before(context.clone(), requestObject, (err, r) => {
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
          addContext(requestObject)
          options.after(context.clone(), result, (err, r) => {
            if (err) {
              next(err)
            }
            else {
              requestObject.result = r
              next()
            }
          })
        }

        const proxyMatched = proxyset.lookup(requestObject.url, requestObject.method)
        if (proxyMatched) {
          proxy(Object.assign({}, context.__init, requestObject), proxyMatched, done)
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
  }, err => {
    if (err) {
      callback(err)
      return
    }

    let finallResult = {}
    if (iterSerial) {
      finallResult = context.__last.result
    }
    else {
      context.__all.forEach((requestObject, index) => {
        finallResult[requestObject.key || '__' + index] = requestObject.result
      })
    }

    options.after(context.clone(), finallResult, callback)
  })

}
