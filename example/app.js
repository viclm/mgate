const express = require('express')
const httproxy = require('../')

const app = express()

app.use(httproxy())

app.listen(4869)
