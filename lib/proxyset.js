const rwildcard = /\*$/

let collection = []
let count = 0

exports.add = function add(item) {
  collection.push(item)
  count++
}

exports.lookup = function lookup(url, method) {
  for (let i = 0 ; i < count ; i++) {
    let item = collection[i]

    if (item.method !== method) {
      continue
    }

    if (rwildcard.test(item.url) && url.indexOf(item.url.slice(0, -2)) === 0) {
      return item
    }

    if (item.url === url) {
      return item
    }
  }
}
