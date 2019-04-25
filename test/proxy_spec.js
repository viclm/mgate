const test = require('ava')
const sinon = require('sinon')
const express = require('express')
const proxy = require('../proxy').proxy

const ProxyOptions = {
  services: {
    local: {
      protocol: 'http',
      address: null
    }
  },
  protocols: {
    http: require('../protocols/http')
  }
}

const proxyWrapper = (graph, options = ProxyOptions) => {
  for (let key in graph) {
    const { prefilter, convert, fallback } = graph[key]
    graph[key] = {
      prefilter: prefilter || (() => Promise.resolve([])),
      convert: convert || (result => Promise.resolve(result)),
      fallback: fallback || (err => Promise.reject(err))
    }
  }
  return proxy(graph, options)
}

let server

test.cb.before(t => {
  const app = express()
  app.use('/api/:r', (req, res) => res.end(`[${req.method}]${req.params.r}`))
  server = app.listen(0, 'localhost', () => {
    ProxyOptions.services.local.address = `http://localhost:${server.address().port}`
    t.end()
  })
})

test.after.always(t => {
  server.close()
})

test('proxy single request', async t => {
  t.plan(3)

  await proxyWrapper({
    xxx: {
      async prefilter() {
        return {
          service: 'local',
          pathname: '/api/xxx',
          method: 'get',
        }
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[GET]xxx' }))

  const error = await t.throws(proxyWrapper({
    xxx: {
      async prefilter() {
        return {
          service: 'local',
          pathname: '/error_api/xxx',
          method: 'get',
        }
      }
    }
  }))

  t.is(error.message, '404')
})

test('merge multiple undependent request', async t => {
  t.plan(1)

  await proxyWrapper({
    x1:{
      async prefilter() {
        return {
          service: 'local',
          pathname: '/api/x1',
          method: 'get',
        }
      }
    },
    x2:{
      async prefilter() {
        return {
          service: 'local',
          pathname: '/api/x2',
          method: 'post',
        }
      }
    }
  }).then(result => t.deepEqual(result, { x1: '[GET]x1', x2: '[POST]x2' }))

})

test('merge multiple dependent request', async t => {
  t.plan(2)

  await proxyWrapper({
    x1:{
      async prefilter() {
        return {
          service: 'local',
          pathname: '/api/x1',
          method: 'get',
        }
      }
    },
    x2:{
      async prefilter(request, { x1 }) {
        return {
          service: 'local',
          pathname: '/api/x2',
          method: 'post',
        }
      }
    },
  }).then(result => t.deepEqual(result, { x1: '[GET]x1', x2: '[POST]x2' }))

  await t.throws(proxyWrapper({
    xxx:{
      async prefilter(request, { yyy }) {
        return {
          service: 'local',
          pathname: '/api/xxx',
        }
      }
    },
  }))

})

test('return false in prefilter to skip a request', async t => {
  t.plan(2)

  await proxyWrapper({
    xxx:{
      async prefilter() {
        return {
          service: 'local',
          pathname: '/api/xxx',
        }
      }
    },
    yyy:{
      async prefilter() {
        return false
      }
    }
  }).then(result => {
    t.deepEqual(result, { xxx: '[GET]xxx', 'yyy': null })
    t.notDeepEqual(result, { xxx: '[GET]xxx', yyy: '[GET]yyy' })
  })

})

test('private key is not contained in the final response', async t => {
  t.plan(1)

  await proxyWrapper({
    xxx:{
      async prefilter(request, { yyy }) {
        return {
          service: 'local',
          pathname: '/api/xxx',
        }
      }
    },
    '#yyy': {
      async prefilter() {
        return {
          service: 'local',
          pathname: '/api/yyy',
        }
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[GET]xxx' }))
})

test('use convert function to transform the request result', async t => {
  t.plan(1)

  await proxyWrapper({
    xxx:{
      async prefilter() {
        return {
          service: 'local',
          pathname: '/api/xxx',
        }
      },
      async convert(result) {
        return result.replace(/x/g, 'y')
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[GET]yyy' }))
})

test('use fallback function to fake result when a request broken', async t => {
  t.plan(2)

  await proxyWrapper({
    xxx:{
      async prefilter() {
        return {
          service: 'local',
          pathname: '/error_api/xxx',
        }
      },
      async fallback(err) {
        t.true(err instanceof Error)
        return '[FALLBACK]xxx'
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[FALLBACK]xxx' }))
})
