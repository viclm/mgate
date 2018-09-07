const fs = require('fs')
const path = require('path')

const rjs = /\.js$/

exports.findModules = function findModules(dir) {
  if (!fs.existsSync(dir)) {
    return []
  }
  dir = path.resolve(dir)
  return fs.readdirSync(dir)
    .map(filename => path.join(dir, filename))
    .reduce((accumulator, filename) => {
      const stat = fs.statSync(filename)
      if (stat.isDirectory()) {
        return accumulator.concat(findModules(filename))
      }
      else if (stat.isFile() && rjs.test(filename)) {
        accumulator.push({
          name: path.basename(filename, '.js'),
          filename: filename,
          module: require(filename)
        })
        return accumulator
      }
      return accumulator
    }, [])
}
