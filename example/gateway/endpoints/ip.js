exports.get = {
  location: {
    prefilter(request) {
      return {
        service: 'graphloc',
        pathname: 'graphql',
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
    convert(result) {
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      return result.data.getLocation ? result.data.getLocation.city.names.en : null
    }
  }
}

exports.post = {
  location: {
    prefilter(request) {
      return {
        service: 'graphloc',
        pathname: 'graphql',
        method: 'post',
        datatype: 'json',
        data: request.body
      }
    },
    convert(result) {
      return result.data
    }
  }
}
