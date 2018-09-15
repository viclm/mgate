const zlib = require('zlib')
const url = require('url')
const querystring = require('querystring')
const FormData = require('form-data')
const debug = require('debug')('mgate:http')
const logger = require('../utils/logger')

const rhttp = /^https?:\/\//
const rjson = /^application\/json\b/
const rformdata = /^multipart\/form-data\b/
const rhump = /[\/\-_]+(.?)/g

function http(options, callback) {

  let protocol = options.protocol || 'http'
  let urls = url.parse(options.url)
  let method = options.method ? options.method.toLowerCase() : 'get'
  let datatype = options.datatype ? options.datatype.toLowerCase() : 'urlencoded'
  let timeout = options.timeout
  let headers = {}
  let data, formdata

  let done = (err, res) => {
    const req = {
      url: options.url,
      method: method,
      headers: headers,
      data: options.data
    }
    logger.http({ err, req, res })
    callback(err, res && res.body)
  }

  if (options.headers) {
    for (let key in options.headers) {
      headers[key.toLowerCase()] = options.headers[key]
    }
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
        done(new Error('unvalid datatype: ' + datatype))
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

  if (protocol === 'http2') {
    const client = require(protocol).connect(url.format({
      protocol: urls.protocol,
      host: urls.hostname,
      port: urls.port
    }))

    req = client.request({
      ':path': urls.path
    })
  }
  else {
    req = require(protocol).request(reqOptions)
  }

  if (options.timeout) {
    req.setTimeout(options.timeout)
    req.on('timeout', function () {
      req.abort()
    })
  }

  req.on('error', done)

  let timingStart = new Date()
  req.on('response', response => {
    let timingStop = new Date()
    let headers, status

    if (protocol === 'http2') {
      headers = response
      status = headers[':status']
      response = req
    }
    else {
      headers = response.headers
      status = response.statusCode
    }

    let res = {
      timing: {
        start: timingStart,
        stop: timingStop
      },
      headers, status
    }

    if (status >= 200 && status < 300 || status === 304) {
      let buffers = []

      response.on('data', chunk => {
        buffers.push(chunk)
      })

      response.on('end', () => {
        res.body = Buffer.concat(buffers)

        if (headers['content-encoding'] === 'gzip') {
          try {
            res.body = zlib.gunzipSync(res.body)
          }
          catch (err) {
            done(err, res)
            return
          }
        }

        res.body = res.body.toString()

        if (rjson.test(headers['content-type'])) {
          try {
            res.body = JSON.parse(res.body)
          }
          catch (e) {
            done(new Error('unvalid json'), res)
            return
          }
        }

        done(null, res)
      })
    }
    else {
      done(new Error(status), res)
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

['http', 'https', 'http2'].forEach(protocol => {
  exports[protocol] = function (options) {
    return new Promise((resolve, reject) => {
      options.protocol = protocol
      http(options, (err, result) => {
        if (err) {
          reject(err)
        }
        else {
          resolve(result)
        }
      })
    })
  }
})

exports.fetch = async function fetch(options) {
  options.method = options.method || 'get'
  options.path = url.parse(options.path).pathname
  options.url = url.resolve(options.service.address, options.path)

  const verify = options.service.verify
    && options.service.verify[`${options.method}-${options.path}`.replace(rhump, (s, p) => p.toUpperCase())]

  if (verify) {
    const err = verify.request(options.data)
    if (err) {
      throw new Error(err)
    }
  }

  return await new Promise((resolve, reject) => {
    options.protocol = options.service.protocol
    http(options, (err, result) => {
      if (err) {
        reject(err)
      }
      else {
        if (verify) {
          const err = verify.response(result)
          if (err) {
            reject(err)
          }
          else {
            resolve(result)
          }
        }
        else {
          resolve(result)
        }
      }
    })
  })
}
