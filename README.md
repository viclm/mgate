# Httproxy

简单易用的 HTTP 转发工具，可将多个 API 接口合并成单一请求，减少客户端并发请求数量。

[![Build Status](https://travis-ci.org/viclm/httproxy.svg?branch=master)](https://travis-ci.org/viclm/httproxy)
[![Coverage Status](https://coveralls.io/repos/github/viclm/httproxy/badge.svg?branch=master)](https://coveralls.io/github/viclm/httproxy?branch=master)
[![npm package](https://img.shields.io/npm/v/httproxy.svg)](https://www.npmjs.org/package/httproxy)

## 目录

* [特点](#特点)
* [原理](#原理)
* [示例](#示例)
* [资源请求选项](#资源请求选项)
* [快速搭建一个转发网关服务器](#快速搭建一个转发网关服务器)
* [手动发起一次转发请求](#手动发起一次转发请求)
* [单例方法](#单例方法)
* [版本要求](#版本要求)

## 特点

- 多个请求合并成一个请求
- 声明响应格式，自动完成数据拼装
- 语法简单易测试，支持同步异步函数
- 内置熔断恢复机制
- 包含一套完整的转发网关

## 原理

一个客户端的请求可能包含多个上游服务接口调用，响应结果通常是对多个接口的数据加工组合。
如果以一种声明式的定义描述最终响应的数据格式，隐藏数据请求和转换的细节，就能够有效的提高开发效率和程序的健壮性。

Httproxy 就是这样一个黑盒工具，它提供的格式定义语法糖非常简洁，能够满足多种转发场景。
Httproxy 内部是一套高效的接口转发逻辑，它自动处理接口之间的依赖关系，并且尽可能的做到并行请求。当某个接口不可用时，它可以将服务隔离并提供必要的降级数据。

## 示例

文件 `hupu.js` 定义了一个聚合接口：`/news/hupu`:`GET`，当访问时会返回类似 `{ "league": "意甲", "topnews": [...] }` 格式的响应。

花括号定义的响应的 JSON 格式，包含 `league` 和 `topnews` 两个键值，注意 `#` 开头代表私有键值，不会包含在最终响应里。

这个接口定义中有3个资源并且存在依赖关系：`index` => `league` => `topnews`，Httproxy 内部会以串行的方式依次处理，`context` 参数对象用于接口之间的数据调用。

### ./news/hupu.js

```javascript
exports.get = {

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

## 资源请求选项

| 名称 | 解释 |
|:-----------|:-|
| `url`      | 请求路径 |
| `method`   | 请求方法 |
| `datatype` | 请求数据类型，目前支持 urlencoded、json 和 form-data |
| `timeout`  | 设置请求延时 |
| `when`     | 判断是否可跳过该次请求 |
| `before`   | 在请求之前修改请求参数 |
| `after`    | 修改请求结果 |
| `fallback` | 当请求不可用时提供降级数据 |
| `fake`     | 跳过默认的 HTTP 请求，自定义请求结果 |


## 快速搭建一个转发网关服务器

```javascript
const httproxy = require('httproxy')

const server = httproxy.createServer({
  rules: 'api' // 指定转发规则文件夹
})
server.start()
```

### 选项

<table>
  <tr>
    <th>名称</th>
    <th>解释</th>
    <th>默认值</th>
  </tr>
  <tr>
    <td><code>port</code></td>
    <td>启动端口。</td>
    <td><code>4869</code></td>
  </tr>
  <tr>
    <td><code>proxy</code></td>
    <td>转发配置。</td>
    <td><code>{}</code></td>
  </tr>
  <tr>
    <td><code>rules</code></td>
    <td>包含转发规则的文件夹。</td>
    <td><code>api</code></td>
  </tr>
  <tr>
    <td><code>response</code></td>
    <td>自定义响应包裹层函数，主要用于传递接口状态和错误信息。</td>
    <td>
<pre><code>
(err, data) => {
  return {
    error: err ? { message: err.message } : null,
    data: data
  }
}
</code></pre>
    </td>
  </tr>
  <tr>
    <td><code>upload</code></td>
    <td>开启文件上传支持，文件会临时存在内存里，谨慎使用。</td>
    <td>
<pre><code>
{
  route: /^$/,
  files: Infinity,
  filesize: Infinity,
  filetype: /^/
}
</code></pre>
    </td>
  </tr>
</table>

### 事件

| 名称 | 解释 |
|:----------|:-|
| `error`   | 服务发生异常 |
| `request` | 一次转发中所有发起的 HTTP 请求统计 |

### 方法

| 名称 | 解释 |
|:--------|:-|
| `on`    | 注册事件监听 |
| `use`   | 加载 Express 中间件 |
| `start` | 启动服务 |
| `stop`  | 关闭服务 |


## 手动发起一次转发请求

```javascript
const express = require('express')
const httproxy = require('httproxy')

const app = express()

app.get('/news', (req, res, next) => {
  httproxy.proxy({
    list: {
      url: 'https://soccer.hupu.com/home/latest-news',
      before(context) {
        return {
          data: {
            league: '意甲',
            page: 1
          }
        }
      },
      after(context, defaults) {
        return defaults.result
          .map(article => article.title)
      }
    }
  }).then(result => res.json(result), next)
})

app.listen(4869)
```

## 单例方法

### `httproxy.proxy(graph, options)`
发起一次转发请求，传入转发规则和选项，返回 Promise 对象。`options` 选项同 `httproxy.config()`。

### `httproxy.request(path, method, options)`
发起一次转发请求，传入目标路径、方法和选项，此方法要求 `httproxy.config()` 提前张载规则列表。`options` 选项同 `httproxy.config()`。

### `httproxy.config(options)`
全局配置，可被单次转发覆盖。

| 名称 | 解释 |
|:--------|:-|
| `rules`    | 规则定义列表，可指定包含规则文件定义的文件夹路径，会自动解析成规则列表。 |
| `initdata`   | 初始化请求数据，用于后续转发使用。 |
| `maxdepends` | 资源的依赖深度，默认值为 2 表示 A => B => C => D 是不被允许的。 |
| `skipnull`   | 是否允许某个资源为空，即最终的响应是否能够包含值为空的字段，默认不包含。 |
| `circuitbreaker`  | 熔断机制开关，目前尚处在试验阶段，默认为 `false` 关闭。直接设置为 `true` 使用默认配置开启熔断，可使用对象字面量进行详细配置。 |

## 版本要求
Httproxy 要求 Node.js 6.12.3 或更高版本

## 协议
MIT
