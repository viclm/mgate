const express = require('express')
const multer = require('multer')
const debug = require('debug')('httproxy:server')
const parse = require('./parse')
const proxy = require('./proxy')

const rfilesize = /^\d+(?:\.\d+)?(?:m|k)?b$/

const defaults = {
  port: 4869,
  proxy: {},
  rules: 'api',
  response(err, data) {
    return {
      error: err ? { message: err.message } : null,
      data: data
    }
  },
  upload: {
    route: /^$/,
    files: Infinity,
    filesize: Infinity,
    filetype: /^/
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

function createProxyRouter(rules, options) {
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

    proxy(graph, Object.assign({}, options, { initdata: data, rules }), (error, data) => {
      res.locals.proxy = { error, data }
      next('router')
    })
  }

  rules.forEach(rule => {
    debug('proxy router, path: %s, method: %s', rule.path, rule.method)
    router[rule.method](rule.path, handle.bind(null, rule.graph))
  })

  return router
}

class Server {
  constructor(options) {
    this.options = options

    this.app = express()
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    this.rules = parse(this.options.rules)
  }

  use() {
    this.app.use(...arguments)
  }

  on() {
    this.app.on(...arguments)
  }

  start() {
    const { options, app, rules } = this

    app.use('/' + options.rules, createProxyRouter(rules, Object.assign({}, options.proxy, {
      onstat(requests) {
        app.emit('request', requests)
      }
    })))

    app.use((req, res, next) => {
      if (res.locals.proxy) {
        res.json(options.response.call(null, res.locals.proxy.error, res.locals.proxy.data))
      }
      else {
        next()
      }
    })

    const server = app.listen(options.port)
    this.stop = () => server.close()
  }

  stop() {}
}

module.exports = function createServer(options) {
  options = Object.assign({}, defaults, options)
  return new Server(options)
}
