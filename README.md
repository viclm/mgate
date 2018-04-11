# Httproxy

简单易用的 HTTP 转发工具，可将多个 API 接口合并成单一请求，减少客户端并发请求数量。

[![Build Status](https://travis-ci.org/viclm/httproxy.svg?branch=master)](https://travis-ci.org/viclm/httproxy)
[![Coverage Status](https://coveralls.io/repos/github/viclm/httproxy/badge.svg?branch=master)](https://coveralls.io/github/viclm/httproxy?branch=master)
[![npm package](https://img.shields.io/npm/v/httproxy.svg)](https://www.npmjs.org/package/httproxy)

## 特点

- 多个请求合并成一个请求
- 支持串行、并行和混合合并
- 语法简单易测试
- 内置熔断恢复机制
- 适配 Express 中间件，可独立使用

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
// 初始化 Httproxy，指定文件夹 api 作为接口定义目录
const proxy = httproxy({ api: 'api'})

app.use(proxy)
app.listen(4869)
```

### api/news/detail.js

```javascript
// 处理来自于路由 /api/news/detail 的 GET 请求
exports.get = {
  // 将2个上游 API 合并成单个请求
  rules: [
    {
      url: 'http://upstream.com/gateway/news/detail'
    },
    {
      url: 'http://upstream.com/gateway/news/comment',
      // 使用前一个请求的结果配置本次请求参数
      before(context) {
        return {
          data: { news_id: context.parent.id }
        }
      },
      // 将两次请求的结果合并发送到客户端
      after(context) {
        return {
          detail: context.parent,
          comment: context.result
        }
      }
    }
  ]
}
```

## 全局配置

### `api`

该目录下包含了所有的转发规则文件。Httproxy 使用文件路径作为路由，通过暴露同名属性接收对应的 HTTP 方法类型。举个例子， `api/news/detail.js` 文件会接收来自于路由 `/api/news/detail` 的请求，如果要处理 `GET` 类型，只需配置 `exports.get` 即可。特别的，`index.js` 文件会处理当前目录的请求。

### `circuitbreaker`

熔断机制开关，默认开启。

## 转发规则

在规则定义模块中暴露同名属性来接收对应的 HTTP 方法类型。

### `formdata`

处理客户端 `form-data` 类型的请求数据

### `rules`

转发的目标请求列表，每个请求串行发送，中间有问题会立即返回。如果要并行发送，将某一步的单个请求配置成数组形式即可。单个请求的配置项较多但是大多能够自解释，函数型的选项可以通过 `return` 返回处理结果，或者返回一个 Promise 进行异步化操作。

### 请求选项

#### `url`
#### `method`
#### `datatype`
指定数据类型，目前支持 form-data 和 json 两种
#### `timeout`
设置请求延时
#### `when(context)`
判断是否可跳过该次请求
#### `before(context)`
在请求之前修改请求参数
#### `after(context)`
修改请求结果
#### `fallback(context)`
当请求不可用时提供降级数据
#### `fake(context)`
完全自定义请求结果，无视以上所有配置

**Context 对象包含一些必要的上下文环境数据，可用于配置单个请求**

- `client` 包含原始客户端请求数据
- `parent` 包含上一个请求结果
- `request 包含本次请求参数
- `result` 包含本次请求结果

## Koa

虽然默认提供了 Express 中间件实现，但是仍旧能够在 Koa 或其他框架中使用，httproxy 暴露了一些底层方法用于自定义场景。

### `httproxy.config`
设置或获取全局配置参数
### `httproxy.parse()`
解析转发规则文件目录
### `httproxy.request()`
发起转发请求

## 协议

MIT
