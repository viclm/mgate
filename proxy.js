const debug = require('debug')('mgate:proxy')
const func = require('./utils/func')
const service = require('./service')

class UnresolvedDependencyError extends Error {}

exports.proxy = async function proxy(graph, options) {
  debug('proxy start')
  debug('graph %o', graph)

  const {
    services,
    protocols,
    request = null
  } = options

  const resolvedGraph = {
    request: {
      public: false,
      resolved: request,
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

  const graphContext = new Proxy(resolvedGraph, {
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
        throw new Error(`${name} is not defined in context`)
      }
    }
  })

  async function resolveField(fieldKey, fieldBody) {
    const { prefilter, convert, fallback } = fieldBody.original
    let result = null, hasThrown = false

    try {
      if (prefilter) {
        const fetchOptions = await func.promisify(prefilter, new Proxy(graphContext, {}))

        if (!fetchOptions) {
          return
        }

        let requestErr

        if (Array.isArray(fetchOptions)) {
          [result, requestErr] = await func.multiple(
            Promise.all.bind(Promise),
            fetchOptions.map(o => service.fetch(services, protocols, o.service, o))
          )
        }
        else {
          [result, requestErr] = await func.multiple(
            service.fetch, services, protocols, fetchOptions.service, fetchOptions
          )
        }

        if (requestErr) {
          if (fallback) {
            result = await func.promisify(fallback, new Proxy(graphContext, {}))
          }
          else {
            throw requestErr
          }
        }
      }

      if (convert) {
        result = await func.promisify(convert, new Proxy(graphContext, {
          get(target, name) { return name === fieldKey ? result : target[name] }
        }))
      }
    }
    catch (err) {
      hasThrown = true
      if (err instanceof UnresolvedDependencyError) {
        fieldBody.depends.push(err.message)
      }
      else {
        throw err
      }
    }
    finally {
      if (!hasThrown) {
        fieldBody.resolved = result
      }
    }
  }

  async function resolve(resolvedGraph) {
    const checkRemains = () => Object.keys(resolvedGraph).filter(i => resolvedGraph[i].resolved === undefined)
    const remains = checkRemains()

    debug('unresolved graph keys %o', remains)
    await Promise.all(remains.map(key => resolveField(key, resolvedGraph[key])))

    const rs = checkRemains()
    if (rs.length === 0) {
      return
    }
    remains.sort()
    rs.sort()
    if (remains.join('|') === rs.join('|')) {
      throw new Error('circular reference in context')
    }

    await resolve(resolvedGraph)
  }

  await resolve(resolvedGraph)

  const output = {}
  for (const key in resolvedGraph) {
    const field = resolvedGraph[key]
    if (field.public) {
      output[key] = field.resolved
    }
  }
  return output
}
