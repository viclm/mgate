exports.get = {

  qq: {
    prefilter({ request }) {
      return {
        service: 'qq',
        path: 'xw/topNews',
      }
    },
    convert({ qq }) {
      return qq.data
        .map(article => article.title)
    }
  },

}
