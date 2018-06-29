const test = require('ava')
const sinon = require('sinon')
const wrap = require('../lib/util/option').wrap

test.cb('wrap a function to a callback-style function', t => {
  t.plan(5)

  const func = function () { return 'ok' }
  const spy = sinon.spy(func)
  const wrapfunc = wrap(spy)

  t.is(typeof wrapfunc, 'function')

  wrapfunc(fn => {
    fn((err, r) => {
      t.ifError(err)
      t.is(r, 'ok')
      t.true(spy.calledOnce)
    })
  })

  const funcThrow = function () { throw new Error }
  const spyThrow = sinon.spy(funcThrow)
  const wrapfuncThrow = wrap(spyThrow)

  wrapfuncThrow(fn => {
    fn((err, r) => {
      t.true(err instanceof Error)
      t.end()
    })
  })
})

test.cb('wrap a promise-return function to a callback-style function', t => {
  t.plan(5)

  const func = function () { return new Promise((resolve, reject) => { setTimeout(() => resolve('ok'), 0) }) }
  const spy = sinon.spy(func)
  const wrapfunc = wrap(spy)

  t.is(typeof wrapfunc, 'function')

  wrapfunc(fn => {
    fn((err, r) => {
      t.ifError(err)
      t.is(r, 'ok')
      t.true(spy.calledOnce)
    })
  })

  const funcReject = function () { return new Promise((resolve, reject) => { setTimeout(() => reject(new Error), 100) }) }
  const spyReject = sinon.spy(funcReject)
  const wrapfuncReject = wrap(spyReject)

  wrapfuncReject(fn => {
    fn((err, r) => {
      t.true(err instanceof Error)
      t.end()
    })
  })
})

test.cb('prepend arguments to target function', t => {
  t.plan(1)

  const spy = sinon.spy()
  const wrapfunc = wrap(spy)

  wrapfunc(fn => {
    fn((err, r) => {
      t.true(spy.calledWith('a', 'b'))
      t.end()
    }, 'a', 'b')
  })
})

test('second argument gets called when wrap a non-function object', t => {
  t.plan(4)

  const spy1 = sinon.spy()
  const spy2 = sinon.spy()

  wrap(function(){})(spy1, spy2)

  t.true(spy1.calledOnce)
  t.true(spy2.notCalled)


  const spy3 = sinon.spy()
  const spy4 = sinon.spy()

  wrap()(spy3, spy4)

  t.true(spy3.notCalled)
  t.true(spy4.calledOnce)
})
