const rwildcard = /\*$/

let allProxyOptions = []
let allProxyOptionsCount

function getProxyOptions(url, method) {
  for (let i = 0 ; i < allProxyOptionsCount ; i++) {
    let proxyOptions = allProxyOptions[i]

    if (proxyOptions.method !== method) {
      continue
    }

    if (rwildcard.test(proxyOptions.url) && url.indexOf(proxyOptions.url.slice(0, -2)) === 0) {
      return proxyOptions
    }

    if (proxyOptions.url === url) {
      return proxyOptions
    }
  }
}

function setProxyOptions(o) {
  allProxyOptions = o
  allProxyOptionsCount = allProxyOptions.length
}

let setting = {
  path: 'api',
  circuitbreaker: true,
}

function set(o) {
  Object.assign(setting, o)
}

module.exports = new Proxy({ getProxyOptions, setProxyOptions, set }, {
  get(target, name) {
    return target.hasOwnProperty(name) ? target[name] :  setting[name]
  }
})
