const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const debug = require('debug')('httproxy:index')
const emitter = require('./util/emitter')
const setting = require('./setting')
const init = require('./init')
const proxy = require('./proxy')

module.exports = function httproxy(options) {
  setting.set(options)

  const allProxyOptions = init(setting.path)
  const router = new express.Router
  const upload = multer()

  const handle = (req, res, next) => {
    const url = req.path
    const method = req.method.toLowerCase()
    const proxyOptions = setting.getProxyOptions(url, method)

    proxy({
      url: url,
      method: method,
      headers: req.headers,
      data: method === 'get' ? req.query : req.body,
    }, proxyOptions, (err, result) => {
      if (err) {
        emitter.emit('error', err)
        next(err)
      }
      else {
        res.json(result)
      }
    })
  }

  setting.setProxyOptions(allProxyOptions)

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

exports.setting = setting

exports.parse = init

exports.proxy = proxy
