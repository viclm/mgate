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

  await proxy({
    xxx: {
      prefilter() {
        return {
          service: 'local',
          path: '/api/xxx',
          method: 'get',
        }
      }
    }
  }, ProxyOptions).then(result => t.deepEqual(result, { xxx: '[GET]xxx' }))

  const error = await t.throws(proxy({
    xxx: {
      prefilter() {
        return {
          service: 'local',
          path: '/error_api/xxx',
          method: 'get',
        }
      }
    }
  }, ProxyOptions))

  t.is(error.message, '404')
})

test('merge multiple undependent request', async t => {
  t.plan(1)

  await proxy({
    x1:{
      prefilter() {
        return {
          service: 'local',
          path: '/api/x1',
          method: 'get',
        }
      }
    },
    x2:{
      prefilter() {
        return {
          service: 'local',
          path: '/api/x2',
          method: 'post',
        }
      }
    }
  }, ProxyOptions).then(result => t.deepEqual(result, { x1: '[GET]x1', x2: '[POST]x2' }))

})

test('merge multiple dependent request', async t => {
  t.plan(2)

  await proxy({
    x1:{
      prefilter() {
        return {
          service: 'local',
          path: '/api/x1',
          method: 'get',
        }
      }
    },
    x2:{
      prefilter({ x1 }) {
        return {
          service: 'local',
          path: '/api/x2',
          method: 'post',
        }
      }
    },
  }, ProxyOptions).then(result => t.deepEqual(result, { x1: '[GET]x1', x2: '[POST]x2' }))

  await t.throws(proxy({
    xxx:{
      prefilter({ yyy }) {
        return {
          service: 'local',
          path: '/api/xxx',
        }
      }
    },
  }, ProxyOptions))

})

test('private key is not contained in the final response', async t => {
  t.plan(1)

  await proxy({
    xxx:{
      prefilter({ yyy }) {
        return {
          service: 'local',
          path: '/api/xxx',
        }
      }
    },
    '#yyy':{
      prefilter() {
        return {
          service: 'local',
          path: '/api/yyy',
        }
      }
    }
  }, ProxyOptions).then(result => t.deepEqual(result, { xxx: '[GET]xxx' }))
})

test('use convert function to transform the request result', async t => {
  t.plan(1)

  await proxy({
    xxx:{
      prefilter() {
        return {
          service: 'local',
          path: '/api/xxx',
        }
      },
      convert({ xxx }) {
        return xxx.replace(/x/g, 'y')
      }
    }
  }, ProxyOptions).then(result => t.deepEqual(result, { xxx: '[GET]yyy' }))
})

test('use fallback function to fake result when a request broken', async t => {
  t.plan(1)

  await proxy({
    xxx:{
      prefilter() {
        return {
          service: 'local',
          path: '/error_api/xxx',
        }
      },
      fallback() {
        return '[FALLBACK]xxx'
      }
    }
  }, ProxyOptions).then(result => t.deepEqual(result, { xxx: '[FALLBACK]xxx' }))
})
// test('use when function to switch a request', async t => {
//   t.plan(4)

//   await proxy({
//     x1:{
//       url: `${remote}/api/x1`,
//       method: 'get',
//       when() { return true }
//     },
//     x2:{
//       url: `${remote}/api/x2`,
//       method: 'get',
//       when() { return Promise.resolve(false) }
//     }
//   }).then(result => {
//     t.deepEqual(result, { x1: '[GET]x1' })
//     t.notDeepEqual(result, { x1: '[GET]x1', x2: '[GET]x2' })
//   })

//   await t.throws(proxy({
//     xxx: {
//       url: `${remote}/api/xxx`,
//       method: 'get',
//       when() {
//         throw new Error('throw')
//       }
//     }
//   }))

//   await t.throws(proxy({
//     xxx: {
//       url: `${remote}/api/xxx`,
//       method: 'get',
//       when() {
//         return Promise.reject(new Error('reject'))
//       }
//     }
//   }))
// })
