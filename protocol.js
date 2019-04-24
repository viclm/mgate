const path = require('path')
const debug = require('debug')('mgate:protocol')
const fsp = require('./utils/fsp')

exports.parse = function parse(dir) {
  const builtinModules = fsp.findModules(path.join(__dirname, 'protocols'))
  const constomModules = fsp.findModules(dir)
  const modules = builtinModules.concat(constomModules)

  debug('resolved protocol module files %O', modules)
  return modules.reduce((protocols, { name, module }) => {
    protocols[name] = module
    return protocols
  }, {})
}
