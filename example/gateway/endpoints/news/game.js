exports.get = {

  sanguosha: {
    prefilter() {
      return {
        service: 'game',
        method: 'sanguosha',
      }
    },
    convert(result) {
      return result.map(article => article.title)
    }
  },

  xbox: {
    prefilter() {
      return {
        service: 'game',
        method: 'xbox',
        payload: {
          pageno: 1
        }
      }
    },
    convert(result) {
      return result.data.map(article => article.Title)
    }
  }

}
