const express = require('express')
const httproxy = require('../')

const app = express()

const proxy = httproxy()

proxy.on('http request', (res) => {
  console.log('[HTTP LOG]', res.timing)
})

proxy.on('http error', (err) => {
  console.log('[HTTP LOG]', err.message)
})

proxy.on('error', (err) => {
  console.log('[LOG]', err.message)
})

app.use(proxy)

app.listen(4869)
