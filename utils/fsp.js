const fs = require('fs')
const path = require('path')

exports.findModules = function findModules(dirname) {
  if (!fs.existsSync(dirname)) { return [] }

  dirname = path.resolve(dirname)

  return fs.readdirSync(dirname)
    .map(filename => path.join(dirname, filename))
    .reduce((modules, filename) => {
      const stat = fs.statSync(filename)
      if (stat.isDirectory()) {
        return modules.concat(findModules(filename))
      }

      if (stat.isFile() && path.extname(filename) === '.js') {
        modules.push({
          name: path.basename(filename, '.js'),
          filename: filename,
          module: require(filename)
        })
      }

      return modules
    }, [])
}
