exports.get = {
  location: {
    url: 'http://api.graphloc.com/graphql',
    method: 'post',
    datatype: 'json',
    before(context) {
      return {
        data: {
          query: `query {
            getLocation(ip: "${context.$client.ip}") {
              city {
                names {
                  en
                }
              }
            }
          }`
        }
      }
    },
    after(context, defaults) {
      return defaults.data.getLocation ? defaults.data.getLocation.city.names.en : null
    }
  }
}

exports.post = {
  location: {
    url: 'http://api.graphloc.com/graphql',
    method: 'post',
    datatype: 'json',
    before(context) {
      return {
        data: context.$client
      }
    },
    after(context, defaults) {
      return defaults.data
    }
  }
}
