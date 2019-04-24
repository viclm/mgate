exports.get = {

  qq: {
    prefilter() {
      return {
        service: 'qq',
        path: 'xw/topNews',
      }
    },
    convert(result) {
      return result.data
        .map(article => article.title)
    }
  },

}
