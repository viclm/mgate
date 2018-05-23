const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const debug = require('debug')('httproxy:index')
const emitter = require('./util/emitter')
const config = require('./config')
const parse = require('./parse')
const proxy = require('./proxy')

const rfilesize = /^\d+(?:\.\d+)?(?:m|k)?b$/

function resolveUploadOptions(options) {
  let { files, filesize, filetype } = options

  if (typeof filesize === 'string') {
    if (rfilesize.test(filesize)) {
      filesize = filesize.replace('mb', '*1024*1024').replace('kb', '*1024').replace('b', '')
      filesize = eval(filesize)
    }
  }

  if (Array.isArray(filetype)) {
    filetype = new RegExp(`\\.(?:${filetype.join('||')})$`)
  }
  else if (typeof filetype === 'string') {
    filetype = new RegExp(`\\.${filetype}$`)
  }

  return {
    limits: {
      files: files || Infinity,
      fileSize: filesize || Infinity
    },
    fileFilter(req, file, cb) {
      cb(null, !filetype || filetype.test(file.originalname))
    }
  }
}

module.exports = function httproxy(options) {
  config.set(options)

  const allProxyOptions = parse(config.get('path'))
  const router = new express.Router

  const handle = (req, res, next) => {
    const url = req.path
    const method = req.method.toLowerCase()
    const proxyOptions = allProxyOptions.get(url, method)

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

    proxy({
      url: url,
      method: method,
      data: data,
      headers: req.headers,
    }, proxyOptions, allProxyOptions, (err, result) => {
      if (err) {
        emitter.emit('error', err)
        next(err)
      }
      else {
        res.json(result)
      }
    })
  }

  for (let i = 0 ; i < allProxyOptions.length ; i ++) {
    let proxyOptions = allProxyOptions[i]
    if (proxyOptions.upload) {
      const upload = multer(resolveUploadOptions(proxyOptions.upload))
      router[proxyOptions.method](proxyOptions.url, upload.any(), handle)
    }
    else {
      router[proxyOptions.method](proxyOptions.url, handle)
    }
  }

  return new Proxy([express.json(), express.urlencoded({ extended: true }), router], {
    get(target, name) {
      return target.hasOwnProperty(name) ? target[name] : emitter[name]
    }
  })
}

exports.config = config

exports.parse = parse

exports.proxy = proxy
