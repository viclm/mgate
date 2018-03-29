# Httproxy

A HTTP proxy middleware for merge request.

```javascript
exports[method] = {
  formdata
  rules
}

options = {
  url
  method
  datatype
  timeout
  when(context)
  before(context)
  after(context)
  fake(context)
}

context = {
  client
  parent
  request
  result
}
```
