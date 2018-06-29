# 示例

## app.js

涉及 Httproxy 全局设置和事件

## api/index.js

响应 `/api/*`

支持任何类型，统一返回空对象 `{}`

## api/news

响应 `/api/news/*`、`/api/news/hupu`、`/api/news/dongqiudi`

涉及到私有键值、资源依赖和大部分请求选项，比如 `when`、`repeat`、`fake`、`before`、`after`

## api/cinema

响应 `/api/news/*`

涉及到 `application/json` 请求类型和 `timeout`、`fallback` 请求选项

## api/image

响应 `/api/news/*`

涉及到 `form-data` 请求类型和文件上传
