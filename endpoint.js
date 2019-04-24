const path = require('path')
const pathToRegexp = require('path-to-regexp')
const debug = require('debug')('mgate:endpoint')
const fsp = require('./utils/fsp')

const rindex = /\bindex(?:\.js)?$/
const rhttpMethod = /^get|head|post|put|delete|connect|options|trace$/
const rslash = /\//g

function promisify(func) {
  return (...args) => {
    let ret
    try {
      ret = func(...args)
    }
    catch (err) {
      return Promise.reject(err)
    }

    return ret instanceof Promise ? ret : Promise.resolve(ret)
  }
}

exports.parse = function parse(dirname) {
  let modules = fsp.findModules(dirname)

  debug('resolved endpoint module files %O', modules)

  modules.sort((a, b) => {
    const na = a.filename.match(rslash).length
    const nb = b.filename.match(rslash).length
    if (na === nb) {
      return Number(rindex.test(a.filename)) || -Number(rindex.test(b.filename))
    }
    return nb - na
  })
  
  modules = modules.reduce((modules, { name, filename, module }) => {
    return modules.concat(
      Reflect.ownKeys(module)
      .filter(method => rhttpMethod.test(method))
      .map(method => {
        const graph = module[method]

        for (let key in graph) {
          const { prefilter, convert, fallback } = graph[key]
          graph[key] = {
            prefilter: prefilter ? promisify(prefilter) : () => Promise.resolve([]),
            convert: convert ? promisify(convert) : result => Promise.resolve(result),
            fallback: fallback ? promisify(fallback) : err => Promise.reject(err)
          }
        }

        return {
          path: pathToRegexp('/' + path.relative(dirname, filename).slice(0, -3).replace(rindex, '*')),
          method,
          graph
        }
      })
    )
  }, [])

  return modules
}
