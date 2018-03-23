const express = require('express')
const httproxy = require('../')

const app = express()

const proxy = httproxy()

proxy.on('http request', (res) => {
  console.log('[LOG]', res.timing)
})

app.use(proxy)

app.listen(4869)
