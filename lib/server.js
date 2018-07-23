const express = require('express')
const multer = require('multer')
const debug = require('debug')('httproxy:server')
const emitter = require('./util/emitter')
const config = require('./config')
const parse = require('./parse')
const proxy = require('./proxy')

const rfilesize = /^\d+(?:\.\d+)?(?:m|k)?b$/

const defaults = {
  path: 'api',
  upload: {
    route: /^/,
    files: Infinity,
    filesize: Infinity,
    filetype: /^/
  },
  response(err, data) {
    return {
      error: err ? { message: err.message } : null,
      data: data
    }
  }
}

function resolveUploadOptions(options) {
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

module.exports = function server(port, options) {
  options = Object.assign(defaults, options)

  config.set({
    rules: parse(options.path),
    maxdepends: options.maxdepends,
    skipnull: options.skipnull === false,
    circuitbreaker: options.circuitbreaker,
  })

  const app = express()
  const router = new express.Router

  const handle = (graph, req, res, next) => {
    const method = req.method.toLowerCase()

    let data = method === 'get' ? req.query : req.body
    if (req.files) {
      data = req.files.reduce((obj, file) => {
        obj[file.fieldname] = {
          value: file.buffer,
          options: {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size
          }
        }
        return obj
      }, Object.assign({}, data))
    }

    proxy(data, graph, (err, result) => {
      if (err) {
        emitter.emit('error', err)
      }
      res.json(options.response(err, result))
    })
  }

  config.rules.map(rule => {
    if (options.upload && options.upload.route.test(rule.path)) {
      const upload = multer(resolveUploadOptions(options.upload))
      router[rule.method](rule.path, upload.any(), handle.bind(null, rule.graph))
    }
    else {
      router[rule.method](rule.path, handle.bind(null, rule.graph))
    }
  })

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(router)

  app.on = function on(event, handler) {
    emitter.on(event, handler)
  }

  app.listen(port)

  return app
}
