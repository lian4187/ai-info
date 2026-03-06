# API 参考

## 概述

- **Base URL**: `http://localhost:8000/api/v1`
- **Content-Type**: `application/json`
- **时间格式**: ISO 8601 (`YYYY-MM-DDTHH:MM:SS` 或 `YYYY-MM-DD`)

## 健康检查

### GET `/health`

检查服务是否正常运行。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/health
```

**返回值：**
```json
{
  "status": "ok"
}
```

---

## 订阅源管理 (Feeds)

### GET `/feeds`

获取所有订阅源列表。

**Query 参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | int | 否 | 按分类 ID 筛选 |

**请求示例：**
```bash
curl http://localhost:8000/api/v1/feeds
curl "http://localhost:8000/api/v1/feeds?category_id=1"
```

**返回值：**
```json
[
  {
    "id": 1,
    "url": "https://example.com/feed.xml",
    "title": "Example Feed",
    "description": "Feed description",
    "site_url": "https://example.com",
    "category_id": 1,
    "is_active": true,
    "fetch_interval_minutes": 120,
    "etag": null,
    "last_modified": null,
    "last_fetched_at": "2026-03-06T10:00:00",
    "created_at": "2026-03-01T00:00:00",
    "updated_at": "2026-03-06T10:00:00",
    "article_count": 42
  }
]
```

---

### POST `/feeds`

创建新的订阅源。

**请求体：**
```json
{
  "url": "https://example.com/feed.xml",
  "title": "Feed Title (可选，不填则自动获取)",
  "category_id": 1,
  "fetch_interval_minutes": 120
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | RSS/Atom 订阅源 URL |
| title | string | 否 | 订阅源标题，不填则自动获取 |
| category_id | int | 否 | 所属分类 ID |
| fetch_interval_minutes | int | 否 | 抓取间隔（分钟），默认 120，最小 5 |

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/feeds \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/feed.xml"}'
```

**返回值：** `201 Created`

---

### GET `/feeds/{feed_id}`

获取单个订阅源详情。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/feeds/1
```

---

### PUT `/feeds/{feed_id}`

更新订阅源信息。

**请求体：**
```json
{
  "title": "New Title",
  "category_id": 2,
  "is_active": false,
  "fetch_interval_minutes": 60
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 新标题 |
| category_id | int | 否 | 新分类 ID |
| is_active | bool | 否 | 是否启用 |
| fetch_interval_minutes | int | 否 | 抓取间隔（分钟），最小 5 |

**请求示例：**
```bash
curl -X PUT http://localhost:8000/api/v1/feeds/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

---

### DELETE `/feeds/{feed_id}`

删除订阅源。

**请求示例：**
```bash
curl -X DELETE http://localhost:8000/api/v1/feeds/1
```

**返回值：** `204 No Content`

---

### POST `/feeds/fetch-all`

手动触发所有活跃订阅源的抓取。

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/feeds/fetch-all
```

**返回值：**
```json
{
  "total_feeds": 10,
  "successful": 8,
  "failed": 2,
  "new_articles": 45
}
```

---

### POST `/feeds/{feed_id}/fetch`

手动触发单个订阅源的抓取。

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/feeds/1/fetch
```

**返回值：**
```json
{
  "feed_id": 1,
  "new_articles": 5,
  "message": "Fetched successfully"
}
```

---

## 分类管理 (Categories)

### GET `/feeds/categories/`

获取所有分类（树形结构）。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/feeds/categories/
```

**返回值：**
```json
[
  {
    "id": 1,
    "name": "Technology",
    "parent_id": null,
    "created_at": "2026-03-01T00:00:00",
    "children": [
      {
        "id": 2,
        "name": "AI",
        "parent_id": 1,
        "created_at": "2026-03-01T00:00:00",
        "children": []
      }
    ]
  }
]
```

---

### POST `/feeds/categories/`

创建新分类。

**请求体：**
```json
{
  "name": "Technology",
  "parent_id": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 分类名称 |
| parent_id | int | 否 | 父分类 ID，为空表示顶级分类 |

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/feeds/categories/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Technology"}'
```

**返回值：** `201 Created`

---

### DELETE `/feeds/categories/{category_id}`

删除分类。

**请求示例：**
```bash
curl -X DELETE http://localhost:8000/api/v1/feeds/categories/1
```

**返回值：** `204 No Content`

---

## 文章管理 (Articles)

### GET `/articles`

获取文章列表（分页、支持筛选）。

**Query 参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| feed_id | int | 否 | - | 按订阅源筛选 |
| is_read | bool | 否 | - | 按已读状态筛选 |
| is_starred | bool | 否 | - | 按收藏状态筛选 |
| search | string | 否 | - | 搜索标题关键词 |
| start_time | datetime | 否 | - | 起始时间（ISO 8601），筛选 published_at >= start_time 的文章 |
| end_time | datetime | 否 | - | 结束时间（ISO 8601），筛选 published_at < end_time 的文章 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页数量（最大 200） |

**请求示例：**
```bash
# 基础查询
curl "http://localhost:8000/api/v1/articles?page=1&page_size=10"

# 按订阅源筛选
curl "http://localhost:8000/api/v1/articles?feed_id=1"

# 按已读状态筛选
curl "http://localhost:8000/api/v1/articles?is_read=false"

# 按收藏状态筛选
curl "http://localhost:8000/api/v1/articles?is_starred=true"

# 搜索标题关键词
curl "http://localhost:8000/api/v1/articles?search=AI"

# 时间范围查询
curl "http://localhost:8000/api/v1/articles?start_time=2026-03-01T00:00:00&end_time=2026-03-06T00:00:00"

# 仅使用起始时间
curl "http://localhost:8000/api/v1/articles?start_time=2026-03-01"

# 组合查询
curl "http://localhost:8000/api/v1/articles?feed_id=1&is_read=false&start_time=2026-03-01"
```

**返回值：**
```json
{
  "items": [
    {
      "id": 1,
      "feed_id": 1,
      "guid": "article-123",
      "title": "Article Title",
      "url": "https://example.com/article",
      "author": "Author Name",
      "content": "<p>Article content...</p>",
      "published_at": "2026-03-06T10:00:00",
      "is_read": false,
      "is_starred": false,
      "created_at": "2026-03-06T10:00:00"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 10
}
```

---

### 时间查询示例

#### 查询今天的文章
```bash
curl "http://localhost:8000/api/v1/articles?start_time=2026-03-06T00:00:00&end_time=2026-03-07T00:00:00"
```

#### 查询本周文章
```bash
curl "http://localhost:8000/api/v1/articles?start_time=2026-03-03&end_time=2026-03-10"
```

#### 查询本月文章
```bash
curl "http://localhost:8000/api/v1/articles?start_time=2026-03-01&end_time=2026-04-01"
```

#### 查询某个时间点之后的所有文章
```bash
curl "http://localhost:8000/api/v1/articles?start_time=2026-03-01T00:00:00"
```

#### 查询某个时间点之前的所有文章
```bash
curl "http://localhost:8000/api/v1/articles?end_time=2026-03-06T00:00:00"
```

#### 组合查询：最近 7 天未读文章
```bash
curl "http://localhost:8000/api/v1/articles?start_time=2026-02-28&is_read=false"
```

#### 组合查询：特定订阅源上周文章
```bash
curl "http://localhost:8000/api/v1/articles?feed_id=1&start_time=2026-02-24&end_time=2026-03-03"
```

---

### 常见文章查询场景

| 场景 | Query 参数 |
|------|------------|
| 所有未读文章 | `?is_read=false` |
| 所有收藏文章 | `?is_starred=true` |
| 特定订阅源文章 | `?feed_id=1` |
| 搜索标题关键词 | `?search=AI` |
| 今日未读文章 | `?is_read=false&start_time=2026-03-06` |
| 本周收藏文章 | `?is_starred=true&start_time=2026-03-03` |
| 最近 3 天某订阅源文章 | `?feed_id=1&start_time=2026-03-03` |
| 上月所有文章 | `?start_time=2026-02-01&end_time=2026-03-01` |

---

### GET `/articles/{article_id}`

获取单篇文章详情。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/articles/1
```

---

### PUT `/articles/{article_id}/read`

切换文章已读状态。

**请求示例：**
```bash
curl -X PUT http://localhost:8000/api/v1/articles/1/read
```

**返回值：** 返回更新后的文章对象

---

### PUT `/articles/{article_id}/star`

切换文章收藏状态。

**请求示例：**
```bash
curl -X PUT http://localhost:8000/api/v1/articles/1/star
```

**返回值：** 返回更新后的文章对象

---

## OPML 导入导出

### POST `/opml/import`

上传 OPML 文件导入订阅。

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/opml/import \
  -F "file=@subscriptions.opml"
```

**返回值：**
```json
{
  "feeds_imported": 15,
  "categories_imported": 3,
  "skipped": 2
}
```

---

### POST `/opml/import-url`

从 URL 导入 OPML 文件。

**请求体：**
```json
{
  "url": "https://example.com/subscriptions.opml"
}
```

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/opml/import-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/subscriptions.opml"}'
```

**返回值：** 同上

---

### GET `/opml/export`

导出订阅为 OPML 文件。

**请求示例：**
```bash
curl -O http://localhost:8000/api/v1/opml/export
```

**返回值：** `application/xml` 格式的 OPML 文件，浏览器会自动下载为 `subscriptions.opml`
