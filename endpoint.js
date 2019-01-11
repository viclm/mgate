const path = require('path')
const pathToRegexp = require('path-to-regexp')
const debug = require('debug')('mgate:endpoint')
const fsp = require('./utils/fsp')

const rindex = /\bindex(?:\.js)?$/
const rHttpMethod = /^get|head|post|put|delete|connect|options|trace$/
const rslash = /\//g

exports.parse = function parse(dir) {
  let modules = fsp.findModules(dir)

  debug('resolved endpoint module files %O', modules)

  modules.sort((a, b) => {
    const na = a.filename.match(rslash).length
    const nb = b.filename.match(rslash).length
    if (na === nb) {
      return Number(rindex.test(a.filename)) || -Number(rindex.test(b.filename))
    }
    return nb - na
  })
  
  modules = modules.reduce((accumulator, { name, filename, module }) => {
    return accumulator.concat(
      Object.keys(module)
      .filter(method => {
        return rHttpMethod.test(method)
      })
      .map(method => {
        return {
          path: pathToRegexp('/' + path.relative(dir, filename).slice(0, -3).replace(rindex, '*')),
          method: method,
          graph: module[method]
        }
      })
    )
  }, [])

  return modules

}
