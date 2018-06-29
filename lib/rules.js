const rwildcard = /\*$/
const allProxyRules = []

function lookup(rules, path, method) {
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

module.exports = new Proxy(allProxyRules, {
  get(target, name) {
    return name === 'get' ? lookup.bind(null, target) : target[name]
  }
})
