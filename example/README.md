# 示例

## app.js

全局设置和事件监听。

## api/index.js

响应 `/api/*`

支持任何请求类型，统一返回空对象 `{}`。

## api/news

响应 `/api/news/*`、`/api/news/hupu`、`/api/news/dongqiudi`。

演示了大部分的请求选项，包括请求开关、请求前参数动态调整、请求后结果二次处理和自定义请求行为。
同时还涉及到私有键值、资源依赖、迭代请求等高级功能。

## api/cinema

响应 `/api/news/*`。

涉及到 `application/json` 请求类型和自动降级功能。

## api/image

响应 `/api/news/*`。

涉及到 `form-data` 请求类型和文件上传。
