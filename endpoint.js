const fs = require('fs')
const path = require('path')
const debug = require('debug')('mgate:endpoint')

const rjs = /\.js$/
const rindex = /\bindex$/
const rHttpMethod = /^get|head|post|put|delete|connect|options|trace$/

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
  if (!fs.existsSync(dir)) {
    return []
  }
  dir = path.resolve(dir)
  const basename = path.basename(dir)
  const modules = findRuleModules(dir)
  const allProxyRules = []

  debug('resolved endpoint modules %O', modules)
  modules.forEach(module => {
    const expts = require(module)
    const pathstr = '/' + path.relative(dir, module).slice(0, -3).replace(rindex, '*')

    for (const method in expts) {
      if (!rHttpMethod.test(method)) {
        continue
      }

      debug('resolved endpoint %O', { path: pathstr, method })
      allProxyRules.push({ path: pathstr, method: method, graph: expts[method] })
    }
  })

  return allProxyRules

}
