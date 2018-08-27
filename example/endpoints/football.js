exports.get = {

  topfive: {
    prefilter() {
      return {
        service: 'fake'
      }
    },
    convert({ hupu, dongqiudi }) {
      const all = hupu.concat(dongqiudi)
      const length  = all.length
      return [1, 2, 3, 4, 5].map(() => all[Math.floor(Math.random() * length)])
    }
  },

  hupu: {
    prefilter() {
      return {
        service: 'hupu',
        path: 'home/latest-news',
        data: {
          league: '意甲',
          page: 1
        }
      }
    },
    convert({ hupu }) {
      return hupu.result
        .map(article => article.title)
    }
  },

  dongqiudi: {
    prefilter() {
      return {
        service: 'dongqiudi',
        path: 'app/tabs/iphone/1.json'
      }
    },
    convert({ dongqiudi }) {
      return dongqiudi.articles
        .filter(article => !article.collection_type && !article.is_redirect_h5 && article.template === 'news.html')
        .map(article => article.title)
    }
  }

}
