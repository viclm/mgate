const fs = require('fs')
const path = require('path')
const debug = require('debug')('mgate:service')

const rjs = /\.js$/

function findServiceModules(dir) {
  return fs.readdirSync(dir)
    .map(filename => path.join(dir, filename))
    .filter(filename => rjs.test(filename) && fs.statSync(filename).isFile())
}

exports.parse = function (dir) {
  if (!fs.existsSync(dir)) {
    return {}
  }

  dir = path.resolve(dir)
  const modules = findServiceModules(dir)
  debug('resolved service modules %O', modules)

  const services = modules.reduce((obj, filename) => {
    const name = path.basename(filename, '.js')
    obj[name] = require(filename)
    debug('resolved service %O', { name })
    return obj
  }, {})

  return services
}
