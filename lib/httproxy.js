const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const debug = require('debug')('httproxy:index')
const emitter = require('./util/emitter')
const config = require('./config')
const parse = require('./parse')
const proxy = require('./proxy')

module.exports = function httproxy(options) {
  config.set(options)

  const allProxyOptions = parse(config.get('path'))
  const router = new express.Router
  const upload = multer()

  const handle = (req, res, next) => {
    const url = req.path
    const method = req.method.toLowerCase()
    const proxyOptions = allProxyOptions.get(url, method)

    proxy({
      url: url,
      method: method,
      headers: req.headers,
      data: method === 'get' ? req.query : req.body,
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
    if (proxyOptions.formdata) {
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
