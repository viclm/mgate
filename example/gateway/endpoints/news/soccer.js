exports.get = {

  topfive: {
    convert({ serieA, rest }) {
      return serieA.slice(0, 1).concat(Object.keys(rest).map(league => rest[league][0]))
    }
  },

  serieA: {
    prefilter() {
      return {
        service: 'hupu',
        path: 'home/latest-news',
        data: {
          league: '意甲',
        }
      }
    },
    convert({ serieA }) {
      return serieA.result
        .map(article => article.title)
    }
  },

  '#rest': {
    prefilter() {
      return ['英超', '西甲', '德甲', '中超'].map(league => {
        return {
          service: 'hupu',
          path: 'home/latest-news',
          data: {
            league,
          }
        }
      })
    },
    convert({ rest }) {
      const restMap = {};
      ['英超', '西甲', '德甲', '中超'].forEach((league, index) => {
        restMap[league] = rest[index].result.map(article => article.title)
      })
      return restMap
    }
  }

}
