const debug = require('debug')('httproxy:proxy')
const emitter = require('./util/emitter')
const iterator = require('./util/iterator')
const config = require('./config')
const rules = require('./rules')
const http = require('./http')
const circuitbreaker = require('./circuitbreaker')
const wrap = require('./util/option').wrap

class UnresolvedDependencyError extends Error {}

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

function request(original, context, callback) {
  const when = next => {
    wrap(original.when)(fn => {
      fn((e, r) => {
        if (e || r === false) {
          next(true, [e])
        }
        else {
          next()
        }
      }, context)
    }, next)
  }

  const repeat = next => {
    wrap(original.repeat)(fn => {
      fn((err, r) => {
        if (err) {
          next(true, [err])
        }
        else if (r[Symbol.iterator]) {
          debug('repeat found %o', r)
          iterator.parallel(r, (o, i, n) => {
            const r = Object.assign({}, original)
            delete r.repeat
            request(r, new Proxy(context, {
              get(t, n) {
                return n === '$iterator' ? o : t[n]
              }
            }), n)
          }, (e, r) => next(true, [e, r]))
        }
        else {
          next(true, [new Error('repeat function don\'t return an iterable object')])
        }
      }, context)
    }, next)
  }

  const fake = next => {
    wrap(original.fake)(fn => {
      fn((e, r) => {
        next(true, [e, r])
      }, context)
    }, next)
  }

  const before = next => {
    const options = {
      url: original.url,
      method: original.method,
      timeout: original.timeout,
      datatype: original.datatype,
    }
    wrap(original.before)(fn => {
      fn((e, r) => {
        if (e) {
          next(true, [e])
        }
        else {
          next(null, Object.assign(options, r))
        }
      }, context, options)
    }, () => next(null, options))
  }

  const fetch = (next, options) => {
    const matched = rules.get(options.url, options.method)
    if (matched) {
      proxy(options.data || {}, matched, (e, r) => next(null, { e, r }))
    }
    else {
      httpWrapper(options, (e, r) => next(null, { e, r }))
    }
  }

  const after = (next, { e, r }) => {
    if (e) {
      next(null, e)
      return
    }
    wrap(original.after)(fn => {
      fn((e, r) => {
        next(true, [e, r])
      }, context, r)
    }, () => next(true, [null, r]))
  }

  const fallback = (next, e) => {
    wrap(original.fallback)(fn => {
      fn((e, r) => {
        next(true, [e, r])
      }, context)
    }, () => next(true, [e]))
  }

  iterator.serial(
    [when, repeat, fake, before, fetch, after, fallback],
    (f, i, n, d) => f(n, d),
    (err, args) => callback(...args)
  )
}

function proxy(requestdata, graph, callback) {
  debug('proxy start with graph %o', graph)
  const resolvedGraph = {
    $client: {
      public: false,
      resolved: requestdata,
    }
  }

  Object.keys(graph).forEach(key => {
    const rk = key.charAt(0) === '#' ? key.substr(1) : key
    resolvedGraph[rk] = {
      public: rk === key,
      original: graph[key],
      depends: [],
      resolved: undefined
    }
  })

  const resolveField = (field, callback) => {
    const context = new Proxy(resolvedGraph, {
      get(target, name) {
        if (name in target) {
          if (target[name].resolved === undefined) {
            throw new UnresolvedDependencyError(name)
          }
          else {
            return target[name].resolved
          }
        }
        else {
          throw new Error(`${name} is not defined`)
        }
      }
    })

    request(field.original, context, (err, r) => {
      if (err instanceof UnresolvedDependencyError && field.depends.filter(i => i === err.message).length === config.get('maxdepends')) {
        callback(new Error(`dependency path for ${err.message} is greater than ${config.get('maxdepends')}`))
      }
      else if (err instanceof UnresolvedDependencyError) {
        field.depends.push(err.message)
        callback()
      }
      else if (err) {
        callback(err)
      }
      else {
        field.resolved = r === undefined ? null : r
        callback()
      }
    })
  }

  const resolve = (resolvedGraph, callback) => {
    const rest = Object.keys(resolvedGraph).filter(i => resolvedGraph[i].resolved === undefined)
    if (rest.length === 0) {
      callback()
      return
    }

    debug('unresolved graph keys %o', rest)
    iterator.parallel(rest, (key, index, next) => resolveField(resolvedGraph[key], next), err => {
      if (err) {
        callback(err)
      }
      else {
        resolve(resolvedGraph, callback)
      }
    })

  }

  resolve(resolvedGraph, err => {
    if (err) {
      debug('resolve graph abortively')
      callback(err)
    }
    else {
      debug('resolve graph successfully')
      const output = {}
      for (const key in resolvedGraph) {
        const field = resolvedGraph[key]
        if (field.public && (!config.get('skipnull') || field.resolved !== null)) {
          output[key] = field.resolved
        }
      }
      callback(null, output)
    }
  })

}

module.exports = proxy
