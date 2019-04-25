const zlib = require('zlib')
const url = require('url')
const querystring = require('querystring')
const FormData = require('form-data')
const protobuf = require('protobufjs')
const debug = require('debug')('mgate:http')
const logger = require('../utils/logger')
const path = require('path')

const rhttp = /^https?:\/\//
const rjson = /^application\/json\b/
const rformdata = /^multipart\/form-data\b/
const rnoword = /[\/\-_]/g

const Protobufs = new Map()

function loadProtobuf(filename) {
  const lookup = (namespace, type, parentName) => {
    let result = []
    let fullname = parentName + namespace.name
    if (namespace instanceof type) {
      result.push([fullname, namespace])
    }
    if (namespace.hasOwnProperty('nested')) {
      result = namespace.nestedArray.reduce((arr, child) => {
        return arr.concat(lookup(child, type, fullname + '.'))
      }, result)
    }
    return result
  }

  const root = protobuf.loadSync(filename)
  const namespace = root.nestedArray[0]
  const services = lookup(namespace, protobuf.Service, '')
  const types = lookup(namespace, protobuf.Type, '').reduce((types, item) => {
    types[item[0]] = item[1]
    return types
  }, {})

  const resolved = services.reduce((resolved, item) => {
    for (let name in item[1].methods) {
      const method = item[1].methods[name]
      const requestType = types[namespace.name + '.' + method.requestType]
      const responseType = types[namespace.name + '.' + method.responseType]
      const verify = {
        request(data) {
          let err
          if (err = requestType.verify(data)) {
            throw new Error(`request parameter for service ${namespace.name}.${name}() verification failed: ${err}`)
          }
        },
        response(data) {
          let err
          if (err = responseType.verify(data)) {
            throw new Error(`response result for service ${namespace.name}.${name}() verification failed: ${err}`)
          }
        }
      }
      resolved.set(new RegExp(name, 'i'), verify)
    }
    return resolved
  }, new Map())

  debug('resolved protos %O', resolved)
  return resolved
}

function http(options, callback) {

  let urls = url.parse(options.url)
  let method = options.method ? options.method.toLowerCase() : 'get'
  let datatype = options.datatype ? options.datatype.toLowerCase() : 'urlencoded'
  let timeout = options.timeout
  let http2 = options.http2
  let headers = {}
  let data, formdata

  let done = (err, res) => {
    const req = {
      url: options.url,
      method: method,
      headers: headers,
      data: options.data
    }
    callback(err, res && res.body, req, res)
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

  if (http2) {
    const client = require('http2').connect(
      url.format({
        protocol: urls.protocol,
        host: urls.hostname,
        port: urls.port
      })
    )

    req = client.request(Object.assign({ ':method': method.toUpperCase(), ':path': urls.path }, headers))
  }
  else {
    req = require(urls.protocol.slice(0, -1)).request(reqOptions)
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

    if (http2) {
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

exports.http = http

exports.fetch = async function fetch(options) {
  let pathname = url.parse(options.url).pathname.replace(rnoword, '')
  let protoFileName = options.protobuf
  let protos, verify

  if (protoFileName) {
    if (Protobufs.get(protoFileName)) {
      debug('load protos from cache')
      protos = Protobufs.get(protoFileName)
    }
    else {
      debug('load protos from file')
      protos = loadProtobuf(protoFileName)
      Protobufs.set(protoFileName, protos)
    }
  }

  if (protos) {
    for (let [r, v] of protos) {
      if (r.test(pathname)) {
        debug('verify request')
        verify = v
        verify.request(options.data)
      }
    }
  }

  return new Promise((resolve, reject) => {
    http(options, (err, body, req, res) => {
      logger.http({ err, req, res })
      if (err) {
        reject(err)
      }
      else {
        resolve(body)
      }
    })
  }).then(body => {
    if (verify) {
      debug('verify response')
      verify.response(body)
    }
    return body
  })
}
