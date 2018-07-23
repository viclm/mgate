const rwildcard = /\*$/

const settings = {
  rules: [],
  maxdepends: 2,
  skipnull: true,
  circuitbreaker: false,
}

function ruleSearch(rules, path, method) {
  for (let i = 0 ; i < rules.length ; i++) {
    let rule = rules[i]
    if (rule.method !== method) {
      continue
    }
    if (rwildcard.test(rule.path) && path.indexOf(rule.path.slice(0, -2)) === 0) {
      return rule.graph
    }
    if (rule.path === path) {
      return rule.graph
    }
  }
}

module.exports = new Proxy(settings, {
  get(target, name) {
    if (name === 'set') {
      return (key, value) => {
        if (typeof key === 'object') {
          Object.assign(target, key)
        }
        else {
          target[key] = value
        }
      }
    }
    else if (name === 'rule') {
      return ruleSearch.bind(null, target.rules)
    }
    else {
      return target[name]
    }
  }
})
