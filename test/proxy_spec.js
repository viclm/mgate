const test = require('ava')
const sinon = require('sinon')
const express = require('express')
const pify = require('pify')
const option = require('../lib/util/option')
const proxy = pify(require('../lib/proxy'))

let app
let server
let remote

test.cb.before(t => {
  app = express()
  app.use('/api/:r', (req, res) => res.end(`[${req.method}]${req.params.r}`))
  server = app.listen(0, 'localhost', () => {
    remote = `http://localhost:${server.address().port}`
    t.end()
  })
})

test.after.always(t => {
  server.close()
})

test('proxy single request', async t => {
  t.plan(3)

  await proxy({}, {
    xxx: {
      url: `${remote}/api/xxx`,
      method: 'get',
    }
  }).then(result => t.deepEqual(result, { xxx: '[GET]xxx' }))

  const error = await t.throws(proxy({}, {
    xxx: {
      url: `${remote}/error_api/xxx`,
      method: 'get',
    }
  }))

  t.is(error.status, 404)
})

test('merge multiple serial request', async t => {
  t.plan(1)

  await proxy({}, {
    x1:{
      url: `${remote}/api/x1`,
      method: 'get',
    },
    x2:{
      url: `${remote}/api/x2`,
      method: 'get',
    }
  }).then(result => t.deepEqual(result, { x1: '[GET]x1', x2: '[GET]x2' }))
})

test('use when function to skip a request', async t => {
  t.plan(4)

  await proxy({}, {
    x1:{
      url: `${remote}/api/x1`,
      method: 'get',
      when() { return true }
    },
    x2:{
      url: `${remote}/api/x2`,
      method: 'get',
      when() { return Promise.resolve(false) }
    }
  }).then(result => {
    t.deepEqual(result, { x1: '[GET]x1' })
    t.notDeepEqual(result, { x1: '[GET]x1', x2: '[GET]x2' })
  })

  await t.throws(proxy({}, {
    xxx: {
      url: `${remote}/api/xxx`,
      method: 'get',
      when() {
        throw new Error('throw')
      }
    }
  }))

  await t.throws(proxy({}, {
    xxx: {
      url: `${remote}/api/xxx`,
      method: 'get',
      when() {
        return Promise.reject(new Error('reject'))
      }
    }
  }))
})

test('use before function to change the request options', async t => {
  t.plan(2)

  await proxy({}, {
    xxx:{
      url: `${remote}/api/xxx`,
      method: 'get',
      before() {
        return { method: 'post' }
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[POST]xxx' }))

  await proxy({}, {
    xxx:{
      url: `${remote}/api/xxx`,
      method: 'get',
      before(context, defaults) {
        return [defaults, defaults]
      }
    }
  }).then(result => t.deepEqual(result, { xxx: ['[GET]xxx', '[GET]xxx'] }))
})

test('use after function to change the result', async t => {
  t.plan(1)

  await proxy({}, {
    xxx:{
      url: `${remote}/api/xxx`,
      method: 'get',
      after(context, defaults) {
        return defaults.replace(/x/g, 'y')
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[GET]yyy' }))
})

test('use fake function to custom a request completely', async t => {
  t.plan(1)

  await proxy({}, {
    xxx:{
      url: `${remote}/api/xxx`,
      method: 'get',
      fake() {
        return '[FAKE]fff'
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[FAKE]fff' }))
})

test('use fallback function to output defaults when a request broken', async t => {
  t.plan(1)

  await proxy({}, {
    xxx:{
      url: `${remote}/error_api/xxx`,
      method: 'get',
      fake() {
        return '[FALLBACK]fff'
      }
    }
  }).then(result => t.deepEqual(result, { xxx: '[FALLBACK]fff' }))
})
