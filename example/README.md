# 示例

启动一个转发网关服务器。

## 支持的接口

### GET `/api/news/*`

### GET `/api/news/hupu`

### GET `/api/news/dongqiudi`

### GET `/api/ip/location`

```
ip=123.125.115.110
```

### POST `/api/ip/location`

`application/json`

```
{
  "query": "query { getLocation(ip: \"23.92.23.30\") { city { names { en } } } }"
}
```

### POST `/api/image/upload`

`form-data`

```
file=<file>
```
