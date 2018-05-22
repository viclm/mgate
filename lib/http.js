const httpRequest = require('http').request
const httpsRequest = require('https').request
const zlib = require('zlib')
const url = require('url')
const querystring = require('querystring')
const FormData = require('form-data')
const debug = require('debug')('httproxy:http')

const rhttp = /^https?:\/\//
const rjson = /^application\/json\b/
const rformdata = /^multipart\/form-data\b/

class HTTPError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
  }
}

module.exports = function http(options, callback) {

  if (!options.url) {
    callback(new Error('url is required'))
    return
  }

  let urls = url.parse(options.url)
  let timeout = options.timeout
  let datatype = options.datatype ? options.datatype.toLowerCase() : 'urlencoded'
  let headers = {}
  let method = 'get'
  let data, formdata

  if (options.headers) {
    for (let key in options.headers) {
      headers[key.toLowerCase()] = options.headers[key]
    }
  }

  if (options.method) {
    method = options.method.toLowerCase()
  }

  if (method === 'get' || method === 'head') {
    let d = querystring.stringify(options.data)
    if (d) {
      urls.path += '?' + d
    }
  }

  if (method === 'post' || method === 'put' || method === 'delete') {
    if (datatype === 'form-data') {
      formdata = new FormData()
      for (let key in options.data) {
        let v = options.data[key]
        if (!v.value) {
          v = {
            value: v
          }
        }
        formdata.append(key, v.value, v.options)
      }
      headers['content-type'] = formdata.getHeaders()['content-type']
      headers['content-length'] = formdata.getLengthSync()
    }
    else {
      if (datatype === 'urlencoded') {
        data = querystring.stringify(options.data)
        headers['content-type'] = 'application/x-www-form-urlencoded'
      }
      else if (datatype === 'json') {
        data = JSON.stringify(options.data)
        headers['content-type'] = 'application/json'
      }
      else if (datatype === 'text') {
        data = options.data
        headers['content-type'] = 'text/plain'
      }
      else if (datatype === 'raw') {
        data = options.data
        headers['content-type'] = 'application/octet-stream'
      }
      else {
        callback(new Error('unvalid datatype: ' + datatype))
        return
      }
      headers['content-length'] = Buffer.byteLength(data)
    }
  }

  let req
  let reqOptions = {
    host: urls.hostname,
    port: urls.port,
    path: urls.path,
    method,
    headers
  }

  debug('http request %O', reqOptions)

  if (urls.protocol === 'https:') {
    req = httpsRequest(reqOptions)
  }
  else {
    req = httpRequest(reqOptions)
  }

  let timingStart = new Date()

  if (options.timeout) {
    req.setTimeout(options.timeout)
    req.on('timeout', function () {
      req.abort()
    })
  }

  req.on('error', callback)

  req.on('response', response => {
    let timingStop = new Date()
    response.timing = {
      start: timingStart,
      stop: timingStop
    }

    let status = response.statusCode

    if (status >= 200 && status < 300 || status === 304) {
      let done = body => {
        response.body = body.toString()
        if (rjson.test(response.headers['content-type'])) {
          let json
          try {
            json = JSON.parse(response.body)
          }
          catch (e) {
            callback(new Error('unvalid json'))
            return
          }
          callback(null, json, response)
        }
        else {
          callback(null, response.body, response)
        }
      }
      let buffers = []

      response.on('data', chunk => {
        buffers.push(chunk)
      })

      response.on('end', () => {
        let body = Buffer.concat(buffers)
        if (response.headers['content-encoding'] === 'gzip') {
          zlib.gunzip(body, (err, decode) => {
            if (err) {
              callback(err)
            }
            else {
              delete response.headers['content-encoding']
              done(decode)
            }
          })
        }
        else {
          done(body)
        }
      })
    }
    else {
      callback(new HTTPError(response.statusMessage, status))
    }
  })


  if (formdata) {
    formdata.pipe(req)
    formdata.on('end', () => {
      req.end()
    })
  }
  else {
    if (data) {
      req.write(data)
    }
    req.end()
  }

  return req

}
