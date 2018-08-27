const multer = require('multer')

const rfilesize = /^\d+(?:\.\d+)?(?:m|k)?b$/

const defaults = {
  files: Infinity,
  filesize: Infinity,
  filetype: /^/
}

function resolveOptions(options) {
  let { files, filesize, filetype } = options

  if (typeof filesize === 'string') {
    if (rfilesize.test(filesize)) {
      filesize = filesize.replace('mb', '*1024*1024').replace('kb', '*1024').replace('b', '')
      filesize = eval(filesize)
    }
  }

  return {
    limits: {
      files: files,
      fileSize: filesize
    },
    fileFilter(req, file, cb) {
      if (filetype.test(file.mimetype)) {
        cb(null, true)
      }
      else {
        cb(new Error('file type is not allowed: ' + file.mimetype))
      }
    }
  }
}

module.exports = function (options) {
  options = Object.assign({}, defaults, options)
  const upload = multer(resolveOptions(options))

  return [upload.any(), (req, res, next) => {
    req.files = req.files.reduce((obj, file) => {
      obj[file.fieldname] = {
        value: file.buffer,
        options: {
          filename: file.originalname,
          contentType: file.mimetype,
          knownLength: file.size
        }
      }
      return obj
    }, {})

    next()
  }]
}
