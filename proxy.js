const debug = require('debug')('mgate:proxy')
const service = require('./service')

class UnresolvedDependencyError extends Error {}

exports.proxy = async function proxy(graph, options) {
  debug('proxy start')
  debug('graph %O', graph)

  const { services, protocols, request = null } = options

  const resolvedGraph = Reflect.ownKeys(graph).reduce((obj, key) => {
    const rk = key.charAt(0) === '#' ? key.substr(1) : key
    obj[rk] = {
      public: rk === key,
      original: graph[key],
      depends: [],
      resolved: undefined
    }
    return obj
  }, {})

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
      const fetchOptions = await prefilter(request, new Proxy(graphContext, {}))

      if (!fetchOptions) { return }

      try {
        if (Array.isArray(fetchOptions)) {
          result = await Promise.all(fetchOptions.map(o => service.fetch(protocols, services, o.service, o)))
        }
        else {
          result = await service.fetch(protocols, services, fetchOptions.service, fetchOptions)
        }
      }
      catch (err) {
        result = await fallback(err, new Proxy(graphContext, {}))
      }

      result = await convert(result, new Proxy(graphContext, {}))
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
    const checkRemains = () => Reflect.ownKeys(resolvedGraph).filter(key => resolvedGraph[key].resolved === undefined)
    const remains = checkRemains()

    debug('unresolved graph keys %O', remains)
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
