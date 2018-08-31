exports.get = {

  topfive: {
    prefilter() {
      return {
        service: 'fake'
      }
    },
    convert({ serieA, rest }) {
      return Object.keys(rest).map(league => rest[league][0]).concat(serieA[0])
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

  rest: {
    prefilter() {
      return ['英超', '西甲', '德甲'].map(league => {
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
      ['英超', '西甲', '德甲'].forEach((league, index) => {
        restMap[league] = rest[index].result.map(article => article.title)
      })
      return restMap
    }
  }

}
