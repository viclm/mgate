const test = require('ava')
const sinon = require('sinon')
const Busboy = require('busboy')
const createServer = require('http').createServer
const zlib = require('zlib')
const http = require('../protocols/http')

const httpWrapper = options => {
  return new Promise((resolve, reject) => {
    http.http(options, (err, body) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(body)
      }
    })
  })
}

let server

test.beforeEach(async t => {
  server = createServer((req, res) => {
    server.emit(req.url.replace(/(\?.*)/, ''), req, res)
  })

  await new Promise((resolve, reject) => {
    server.listen(0, 'localhost', (err) => {
      if (err) {
        reject(err)
      }
      else {
        server.url = `http://localhost:${server.address().port}`
        resolve()
      }
    })
  })
})

test.afterEach.always(t => {
  server.close()
})

test.serial('timeout', async t => {
  t.plan(2)

  server.on('/api/1', (req, res) => {
    setTimeout(() => res.end('ok'), 50)
  })

  await t.throws(httpWrapper({
    url: `${server.url}/api/1`,
    timeout: 10
  }))

  const result = await httpWrapper({
    url: `${server.url}/api/1`,
    timeout: 90
  })
  t.is(result, 'ok')
})

test.serial('method', async t => {
  t.plan(2)

  server.on('/api/1', (req, res) => {
    t.is(req.method, 'GET')
    res.end()
  })

  server.on('/api/2', (req, res) => {
    t.is(req.method, 'POST')
    res.end()
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
  })

  await httpWrapper({
    url: `${server.url}/api/2`,
    method: 'post'
  })

})

test.serial('headers', async t => {
  t.plan(2)

  server.on('/api/1', (req, res) => {
    t.is(req.headers['content-type'], 'application/json')
    t.is(req.headers['x-requested-with'], 'XMLHttpRequest')
    res.end()
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
    headers: {
      'content-type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
})

test.serial('send data', async t => {
  t.plan(3)

  server.on('/api/1', (req, res) => {
    t.is(req.url, '/api/1?foo=bar')
    res.end()
  })

  server.on('/api/2', (req, res) => {
    t.is(req.url, '/api/2')
    req.on('data', chunk => {
      t.is(chunk.toString(), 'foo=bar')
      res.end()
    })
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
    method: 'get',
    data: {
      foo: 'bar'
    }
  })

  await httpWrapper({
    url: `${server.url}/api/2`,
    method: 'post',
    data: {
      foo: 'bar'
    }
  })

})

test.serial('application/octet-stream', async t => {
  t.plan(3)

  server.on('/api/1', (req, res) => {
    t.is(req.url, '/api/1')
    t.is(req.headers['content-type'], 'application/octet-stream')
    req.on('data', chunk => {
      t.is(chunk.toString('hex'), 'abcdef')
      res.end()
    })
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
    method: 'post',
    data: Buffer.from('abcdef', 'hex'),
    datatype: 'raw'
  })

})

test.serial('text/plain', async t => {
  t.plan(3)

  server.on('/api/1', (req, res) => {
    t.is(req.url, '/api/1')
    t.is(req.headers['content-type'], 'text/plain')
    req.on('data', chunk => {
      t.is(chunk.toString(), 'foo')
      res.end()
    })
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
    method: 'post',
    data: 'foo',
    datatype: 'text'
  })

})

test.serial('application/x-www-form-urlencoded', async t => {
  t.plan(3)

  server.on('/api/1', (req, res) => {
    t.is(req.url, '/api/1')
    t.is(req.headers['content-type'], 'application/x-www-form-urlencoded')
    req.on('data', chunk => {
      t.is(chunk.toString(), 'foo=bar')
      res.end()
    })
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
    method: 'post',
    data: {
      foo: 'bar'
    },
    datatype: 'urlencoded'
  })

})

test.serial('application/json', async t => {
  t.plan(3)

  server.on('/api/1', (req, res) => {
    t.is(req.url, '/api/1')
    t.is(req.headers['content-type'], 'application/json')
    req.on('data', chunk => {
      try {
        chunk = JSON.parse(chunk)
      }
      catch (e) {
        return
      }
      t.deepEqual(chunk, {foo: 'bar'})
      res.end()
    })
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
    method: 'post',
    data: {
      foo: 'bar'
    },
    datatype: 'json'
  })

})

test.serial('multipart/form-data', async t => {
  t.plan(2)

  server.on('/api/1', (req, res) => {
    let busboy = new Busboy({ headers: req.headers })
    busboy.on('field', (key, value) => {
      t.is(key, 'foo')
      t.is(value, 'bar')
      res.end()
    })
    req.pipe(busboy)
  })

  await httpWrapper({
    url: `${server.url}/api/1`,
    method: 'post',
    data: {
      foo: 'bar'
    },
    datatype: 'form-data'
  })

})

test.serial('json', async t => {
  t.plan(3)

  server.on('/api/1', (req, res) => {
    res.setHeader('content-type', 'application/json')
    res.write('{"foo": "bar"}')
    res.end()
  })

  server.on('/api/2', (req, res) => {
    res.write('{"foo": "bar"}')
    res.end()
  })

  server.on('/api/3', (req, res) => {
    res.setHeader('content-type', 'application/json')
    res.write('{"foo": "bar}')
    res.end()
  })

  const result1 = await httpWrapper({
    url: `${server.url}/api/1`
  })
  t.deepEqual(result1, { foo: 'bar' })

  const result2 = await httpWrapper({
    url: `${server.url}/api/2`
  })
  t.is(result2, '{"foo": "bar"}')

  await t.throws(httpWrapper({
    url: `${server.url}/api/3`
  }))

})

test.serial('unvalid datatype', async t => {
  t.plan(1)

  server.on('/api/1', (req, res) => {
    res.end('ok')
  })

  await t.throws(httpWrapper({
    url: `${server.url}/api/1`,
    method: 'post',
    data: {
      foo: 'bar'
    },
    datatype: 'xxx'
  }))

})

test.serial('gzip', async t => {
  t.plan(2)

  server.on('/api/1', (req, res) => {
    res.setHeader('content-encoding', 'gzip')
    res.write(zlib.gzipSync('ok'))
    res.end()
  })

  server.on('/api/2', (req, res) => {
    res.setHeader('content-encoding', 'gzip')
    res.write('ok')
    res.end()
  })

  const result = await httpWrapper({
    url: `${server.url}/api/1`
  })
  t.is(result, 'ok')

  await t.throws(httpWrapper({
    url: `${server.url}/api/2`
  }))

})

test.serial('https', async t => {
  t.plan(1)

  const NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const server = require('https').createServer({
    key: require('fs').readFileSync(__dirname + '/helper/key.pem'),
    cert: require('fs').readFileSync(__dirname + '/helper/cert.pem')
  }, (req, res) => {
    res.end('ok')
  })

  await new Promise((resolve, reject) => {
    server.listen(0, 'localhost', (err) => {
      if (err) {
        reject(err)
      }
      else {
        resolve()
      }
    })
  })

  const result = await httpWrapper({
    url: `https://localhost:${server.address().port}/api/i`
  })
  t.is(result, 'ok')

  server.close()
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = NODE_TLS_REJECT_UNAUTHORIZED
})
