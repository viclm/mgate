exports.get = {
  location: {
    prefilter({ request }) {
      return {
        service: 'graphloc',
        path: 'graphql',
        method: 'post',
        datatype: 'json',
        data: {
          query: `query {
            getLocation(ip: "${request.query.ip}") {
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
    convert({ location }) {
      if (location.errors) {
        throw new Error(location.errors[0].message)
      }
      return location.data.getLocation ? location.data.getLocation.city.names.en : null
    }
  }
}

exports.post = {
  location: {
    prefilter({ request }) {
      return {
        service: 'graphloc',
        path: 'graphql',
        method: 'post',
        datatype: 'json',
        data: request.body
      }
    },
    convert({ location }) {
      return location.data
    }
  }
}
