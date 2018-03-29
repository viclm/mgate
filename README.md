# Httproxy

[![Build Status](https://travis-ci.org/viclm/httproxy.svg?branch=master)](https://travis-ci.org/viclm/httproxy)

A HTTP proxy middleware for Express. It supports batch interface forwarding, which means you can merge multiple interface to single one, this is especially useful for client request.

This proxy is very convenient to use, only several options are required to make a complicated proxy request. You can provide a fallback function when upstream interface is unavailable, it may fail immediately when circuit breaks and recover when available.

## Table of contents

- [Install](#install)
- [Usage](#usage)
- [Options](#options)
- [Proxy settings](#proxy-settings)
- [Contributing](#contributing)
- [License](#license)

## Install

You can install it via **Yarn**

```shell
yarn add httproxy
```

## Usage

The code below start an Express server, a httproxy middleware is used by specifying an `api` directory (which is the default) to define proxy settings. The `list.js` in `api` directory defines a GET request, any request targeting `/api/news/list` will be proxyed to `http://upstream.com/gateway/news/list`.

### app.js

```javascript
const express = require('express')
const httproxy = require('httproxy')

const app = express()
const proxy = httproxy({ api: 'api'})

app.use(proxy)
app.listen(4869)
```

### api/news/list.js

```javascript
exports.get = {
  rules: [
    {
      url: 'http://upstream.com/gateway/news/list'
    }
  ]
}
```

## Options

### `api`

Directory for proxy definition. Httproxy will lookup every JavaScript file in this directory and generate corresponding router functions. The name of directory is used by router path prefix, `/data/` is routing while using a `data` directory.

### `circuitbreaker`

There is a circuit breaker service running in backend, you can disable it in development.

## Proxy settings

### `formdata`

Set it true to receive form-data request.

### `rules`

A collection of proxy requests would run serially. Every item is a full request definition, it is worth to be mentioned that you can specify an array of proxy requests running in parallel.All request options are listed below, some are self-explanatory.

* `url`
* `method`
* `datatype` specify datatype for response, `form-data` and `json` is supported
* `timeout` set milliseconds before a request times out
* `when(context)` stops current request when rejected or a false returned
* `before(context)` modify current request options
* `after(context)` modify current request result
* `fallback(context)` return a fallback data when request fails
* `fake(context)` custom a result

The `context` object has several properties

* `client` contains original request data from client
* `parent` contains result of latest proxy request
* `request` contains options for following proxy request
* `result` contains the result of current proxy request


## Contributing
Welcome to contributing, the guidelines are being drafted.


## License
Licensed under the MIT license.
