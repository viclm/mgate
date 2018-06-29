const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const debug = require('debug')('httproxy:index')
const emitter = require('./util/emitter')
const config = require('./config')
const rules = require('./rules')
const parse = require('./parse')
const proxy = require('./proxy')

const rfilesize = /^\d+(?:\.\d+)?(?:m|k)?b$/
const rfiletype = /^/

function resolveUploadOptions(options) {
  let { files, filesize, filetype = rfiletype } = options

  if (typeof filesize === 'string') {
    if (rfilesize.test(filesize)) {
      filesize = filesize.replace('mb', '*1024*1024').replace('kb', '*1024').replace('b', '')
      filesize = eval(filesize)
    }
  }

  return {
    limits: {
      files: files || Infinity,
      fileSize: filesize || Infinity
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

module.exports = function httproxy(options) {
  config.set(options)
  rules.push(...parse(config.get('path')))

  const router = new express.Router

  const handle = (req, res, next) => {
    const method = req.method.toLowerCase()
    const graph = rules.get(req.path, method)
    debug('proxy request received, path: %s, method: %s', req.path, req.method)

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
      res.json(config.get('response')(err, result))
    })
  }

  rules.map(rule => {
    const enableUpload = config.get('upload')
    if (enableUpload === true || enableUpload.route.test(rule.path)) {
      const upload = multer(resolveUploadOptions(enableUpload))
      router[rule.method](rule.path, upload.any(), handle)
    }
    else {
      router[rule.method](rule.path, handle)
    }
  })

  return new Proxy([express.json(), express.urlencoded({ extended: true }), router], {
    get(target, name) {
      return target.hasOwnProperty(name) ? target[name] : emitter[name]
    }
  })
}
