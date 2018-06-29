# Httproxy

简单易用的 HTTP 转发工具，可将多个 API 接口合并成单一请求，减少客户端并发请求数量。

[![Build Status](https://travis-ci.org/viclm/httproxy.svg?branch=master)](https://travis-ci.org/viclm/httproxy)
[![Coverage Status](https://coveralls.io/repos/github/viclm/httproxy/badge.svg?branch=master)](https://coveralls.io/github/viclm/httproxy?branch=master)
[![npm package](https://img.shields.io/npm/v/httproxy.svg)](https://www.npmjs.org/package/httproxy)

## 特点

- 多个请求合并成一个请求
- 声明响应格式，自动完成数据拼装
- 语法简单易测试，支持同步异步函数
- 支持文件上传
- 内置熔断恢复机制
- 适配 Express 中间件，可独立使用

## 原理

一个客户端的请求可能包含多个上游服务接口调用，响应结果通常是对多个接口的数据加工组合。
如果以一种声明式的定义描述最终响应的数据格式，隐藏数据请求和转换的细节，就能够有效的提高开发效率和程序的健壮性。

Httproxy 就是这样一个黑盒工具，它提供的格式定义语法糖非常简洁，能够满足多种转发场景。
Httproxy 内部是一套高效的接口转发逻辑，它自动处理接口之间的依赖关系，并且尽可能的做到并行请求。当某个接口不可用时，它可以提供降级数据并进行服务隔离，并且能够自动恢复。

## 示例

文件 `hupu.js` 定义了一个聚合接口：`/api/news/hupu`:`GET`，当访问时会返回类似 `{ "league": "意甲", "topnews": [...] }` 格式的响应。

花括号定义的响应的 JSON 格式，包含 `league` 和 `topnews` 两个键值，注意 `#` 开头代表私有键值，不会包含在最终响应里。

这个接口定义中有3个资源并且存在依赖关系：`index` => `league` => `topnews`，Httproxy 内部会以串行的方式依次处理，`context` 参数对象用于接口之间的数据调用。

### api/news/hupu.js

```javascript
exports.get = {

  // # 开头为私有属性，不包含在响应里
  '#index': {
    fake() {
      return Math.round(Math.random() * 4)
    }
  },

  league: {
    fake(context) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve([
            '意甲',
            '英超',
            '西甲',
            '德甲',
            '中超',
          ][context.index])
        }, 200)
      })
    }
  },

  topnews: {
    url: 'https://soccer.hupu.com/home/latest-news',
    before(context) {
      return {
        data: {
          league: context.league,
          page: 1
        }
      }
    },
    after(context, defaults) {
      return defaults.result
        .map(article => article.title)
    }
  }

}
```

## 安装

要求 Node.js 6.12.3 或更高版本

```shell
yarn add httproxy
```

## 作为 Express 中间件使用

### app.js

```javascript
const express = require('express')
const httproxy = require('httproxy')

const app = express()

app.use(httproxy({ api: 'api'}))

app.listen(4869)
```

## 全局配置

### `api`

该目录下包含了所有的转发规则文件，目录名也用于请求路径前缀。

### `maxdepends`

资源的依赖深度，默认值为 2 表示 A => B => C => D 是不被允许的。

### `skipnull`

是否允许某个资源为空，即最终的响应是否能够包含值为空的字段，默认不包含。

### `upload`

开启文件上传支持，文件会临时存在内存里，谨慎使用，默认为 `false`。

直接设置为 `true` 开启无限制文件上传，可使用对象字面量进行详细配置。

```
{
  route
  files
  filesize
  filetype
}
```

### `circuitbreaker`

熔断机制开关，目前尚处在试验阶段，默认为 `false` 关闭。

直接设置为 `true` 使用默认配置开启熔断，可使用对象字面量进行详细配置。

```
{
  duration
}
```

### `response`

自定义响应包裹层函数，主要用于传递接口状态和错误信息。

默认值：

```
(err, data) => {
  return {
    error: err ? { message: err.message } : null,
    data: data
  }
}
```


## 请求选项

| 名称 | 解释 |
|:-----------|:-|
| `url`      | 请求路径 |
| `method`   | 请求方法 |
| `datatype` | 请求数据类型，目前支持 form-data 和 json 两种 |
| `timeout`  | 设置请求延时 |
| `when`     | 判断是否可跳过该次请求 |
| `repeat`   | 循环执行请求 |
| `before`   | 在请求之前修改请求参数 |
| `after`    | 修改请求结果 |
| `fallback` | 当请求不可用时提供降级数据 |
| `fake`     | 跳过默认的 HTTP 请求，自定义请求结果 |


## 协议

MIT
