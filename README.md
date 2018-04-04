# Httproxy

Powerful HTTP proxy middleware for Express.

[![Build Status](https://travis-ci.org/viclm/httproxy.svg?branch=master)](https://travis-ci.org/viclm/httproxy)

## Features

- Merge multiple requests to single one
- Serial, parallel or mixed
- Simple syntax and easy to test
- A circuit breaker is built-in

## Installation

Node.js 6.12.3 or higher is required.

Install it with yarn

```shell
yarn add httproxy
```

## Usage

### app.js

```javascript
const express = require('express')
const httproxy = require('httproxy')

const app = express()
// init httproxy with an api directory
const proxy = httproxy({ api: 'api'})

app.use(proxy)
app.listen(4869)
```

### api/news/detail.js

```javascript
// handle incoming GET request from /api/news/detail
exports.get = {
  // merge two upstream requests to one
  rules: [
    {
      url: 'http://upstream.com/gateway/news/detail'
    },
    {
      url: 'http://upstream.com/gateway/news/comment',
      // this request depends last request result
      before(context) {
        return {
          data: { news_id: context.parent.id }
        }
      },
      // merge the two request results to client
      after(context) {
        return {
          detail: context.parent,
          comment: context.result
        }
      }
    }
  ]
}
```

## Global Options

### `api`

Httproxy will lookup every javascript file in this directory, generate corresponding router functions and use the file path as the route. For example, `api/news/detail.js` route `/api/news/detail`, and `api/news/index.js` route `/api/news` or `/api/news/*`.

### `circuitbreaker`

There is a circuit breaker service running in the backend, you can disable it in development.

## Proxy Options

Proxy options are exported by HTTP method name, you can export multiple options for different methods.

### `formdata`

Set it true to receive form-data request.

### `rules`

A collection of upstream requests would run serially. Every item is a full request definition, array requests would run in parallel. All request options are listed below, most of them are self-explanatory, return a Promise in option function make it async.

* `url`
* `method`
* `datatype` specify datatype for response, `form-data` and `json` is supported
* `timeout` set milliseconds before request times out
* `when(context)` determine request is skipped or not
* `before(context)` modify request options
* `after(context)` modify request result
* `fallback(context)` provide fallback data when request fails
* `fake(context)` custom result thoroughly

The `context` object has several properties

* `client` contains original request data from client
* `parent` contains result of latest request
* `request` contains options for following request
* `result` contains the result of current request

## License

Licensed under the MIT license.
