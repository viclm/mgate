# Httproxy

A HTTP proxy middleware for merge request.

```javascript
exports[method] = {
  serial: [options]
  parallel: [options]
  after(context, finallResult)
}

options = {
  key
  url
  method
  datatype
  timeout
  when(context)
  before(context, request)
  after(context, result)
  fake(context)
}
```

```javascript
context = {
  __init: request
  __last: request
  [key]: request
}

request = {
  url
  method
  headers
  data
  result
}
```
