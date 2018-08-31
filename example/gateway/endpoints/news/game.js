exports.get = {

  sanguosha: {
    prefilter() {
      return {
        service: 'game',
        method: 'sanguosha',
      }
    },
    convert({ sanguosha }) {
      return sanguosha.map(article => article.title)
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
    convert({ xbox }) {
      return xbox.data.map(article => article.Title)
    }
  }

}
