exports.get = {

  qq: {
    prefilter() {
      return {
        service: 'qq',
        pathname: 'xw/topNews',
      }
    },
    convert(result) {
      return result.data
        .map(article => article.title)
    }
  },

}
