const test = require('ava')
const sinon = require('sinon')
const express = require('express')
const proxy = require('../proxy').proxy

const services = {
  local: {
    protocol: 'http',
    address: null
  }
}

let server

test.cb.before(t => {
  const app = express()
  app.use('/api/:r', (req, res) => res.end(`[${req.method}]${req.params.r}`))
  server = app.listen(0, 'localhost', () => {
    services.local.address = `http://localhost:${server.address().port}`
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
  }, { services }).then(result => t.deepEqual(result, { xxx: '[GET]xxx' }))

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
  }, { services }))

  t.is(error.status, 404)
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
  }, { services }).then(result => t.deepEqual(result, { x1: '[GET]x1', x2: '[POST]x2' }))

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
  }, { services }).then(result => t.deepEqual(result, { x1: '[GET]x1', x2: '[POST]x2' }))

  await t.throws(proxy({
    xxx:{
      prefilter({ yyy }) {
        return {
          service: 'local',
          path: '/api/xxx',
        }
      }
    },
  }, { services }))

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
  }, { services }).then(result => t.deepEqual(result, { xxx: '[GET]xxx' }))
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
  }, { services }).then(result => t.deepEqual(result, { xxx: '[GET]yyy' }))
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
  }, { services }).then(result => t.deepEqual(result, { xxx: '[FALLBACK]xxx' }))
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

// test('maxdepends option', async t => {
//   t.plan(2)

//   await t.throws(proxy({
//     x1:{
//       url: `${remote}/api/x1`,
//       method: 'get',
//     },
//     x2:{
//       url: `${remote}/api/x2`,
//       method: 'get',
//       when(context) {
//         return context.x1
//       }
//     },
//     x3:{
//       url: `${remote}/api/x3`,
//       method: 'get',
//       when(context) {
//         return context.x2
//       }
//     },
//   }, { maxdepends: 1 }))

//   await t.throws(proxy({
//     x1:{
//       url: `${remote}/api/x1`,
//       method: 'get',
//       when(context) {
//         return context.x1
//       }
//     },
//   }))

// })

// test('skipnull option', async t => {
//   t.plan(2)

//   await proxy({
//     xxx: {
//       fake: () => null
//     }
//   }, { skipnull: false }).then(result => {
//     t.deepEqual(result, { xxx: null })
//   })

//   await proxy({
//     xxx: {
//       fake: () => null
//     }
//   }).then(result => {
//     t.deepEqual(result, {})
//   })
// })

// test('onstat option', async t => {
//   t.plan(10)

//   await proxy({
//     xxx: {
//       url: `${remote}/api/xxx`,
//       method: 'get',
//     }
//   }, {
//     onstat(requests) {
//       t.is(requests.length, 1)
//       t.is(requests[0].request.url, `${remote}/api/xxx`)
//       t.is(requests[0].response.status.code, 200)
//       t.falsy(requests[0].error)
//     }
//   })

//   await t.throws(proxy({
//     xxx: {
//       url: `${remote}/error_api/xxx`,
//       method: 'get',
//     }
//   }, {
//     onstat(requests) {
//       t.is(requests.length, 1)
//       t.is(requests[0].request.url, `${remote}/error_api/xxx`)
//       t.is(requests[0].response.status.code, 404)
//       t.true(requests[0].error instanceof Error)
//     }
//   }))

//   await proxy({
//     xxx: {
//       url: `${remote}/api/xxx`,
//       method: 'get',
//       before(context, defaults) {
//         return [
//           defaults, defaults, defaults
//         ]
//       },
//     }
//   }, {
//     onstat(requests) {
//       t.is(requests.length, 3)
//     }
//   })

// })
