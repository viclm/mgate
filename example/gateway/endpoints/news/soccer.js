exports.get = {

  topfive: {
    convert(result, { serieA, rest }) {
      return serieA.slice(0, 1).concat(Object.keys(rest).map(league => rest[league][0]))
    }
  },

  serieA: {
    prefilter() {
      return {
        service: 'hupu',
        pathname: 'home/latest-news',
        data: {
          league: '意甲',
        }
      }
    },
    convert(result) {
      return result.result
        .map(article => article.title)
    }
  },

  '#rest': {
    prefilter() {
      return ['英超', '西甲', '德甲', '中超'].map(league => {
        return {
          service: 'hupu',
          pathname: 'home/latest-news',
          data: {
            league,
          }
        }
      })
    },
    convert(result) {
      return ['英超', '西甲', '德甲', '中超'].reduce((obj, league, index) => {
        obj[league] = result[index].result.map(article => article.title)
        return obj
      }, {})
    }
  }

}
