const path = require('path')
const debug = require('debug')('mgate:endpoint')
const fsp = require('./utils/fsp')

const rasterisk = /\*$/
const rindex = /\bindex$/
const rHttpMethod = /^get|head|post|put|delete|connect|options|trace$/
const rslash = /\//g

function findRuleModules(dir) {
  let modules = []
  fs.readdirSync(dir).forEach(filename => {
    filename = path.join(dir, filename)
    const stat = fs.statSync(filename)
    if (stat.isDirectory(filename)) {
      modules = modules.concat(findRuleModules(filename))
    }
    else if (stat.isFile() && rjs.test(filename)) {
      modules.push(filename)
    }
  })
  const index = modules.indexOf(path.join(dir, 'index.js'))
  if (index > -1) {
    modules.splice(index, 1)
    modules.push(path.join(dir, 'index.js'))
  }
  return modules.reverse()
}

exports.parse = function parse(dir) {
  let modules = fsp.findModules(dir)

  debug('resolved endpoint module files %O', modules)
  modules = modules.reduce((accumulator, { name, filename, module }) => {
    return accumulator.concat(
      Object.keys(module)
      .filter(method => {
        return rHttpMethod.test(method)
      })
      .map(method => {
        const pathstr = '/' + path.relative(dir, filename).slice(0, -3).replace(rindex, '*')
        return { path: pathstr, method: method, graph: module[method] }
      })
    )
  }, [])

  modules.sort((a, b) => {
    const na = a.path.match(rslash).length
    const nb = b.path.match(rslash).length
    if (na === nb) {
      return Number(rasterisk.test(a.path))
    }
    return nb - na
  })

  return modules

}
