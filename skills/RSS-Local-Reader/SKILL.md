---
name: RSS-Local-Reader
description: "Local RSS reader service integration. Manage RSS subscriptions, browse articles with time-based filtering, and import/export OPML. Actions: subscribe, fetch, list, search, read, star, import, export. Entities: feed, article, category, opml. Filters: unread, starred, feed_id, time range, keyword search."
---
# RSS Local Reader

本地 RSS 阅读器服务集成，支持订阅管理、文章浏览、时间范围查询和 OPML 导入导出。

## 功能范围

- **RSS Feed 管理**：订阅、分类、自动抓取
- **文章管理**：列表、筛选、已读/收藏状态、时间范围查询
- **OPML 导入导出**：批量管理订阅

## 前置条件

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AI_INFO_API_URL` | `http://localhost:8000` | 后端 API 地址 |

---

## API 参考

详细的 API 文档请参阅 [references/api.md](references/api.md)。

### 快速参考

| 模块 | 端点 | 功能 |
|------|------|------|
| Health | `GET /health` | 健康检查 |
| Feeds | `GET /feeds` | 订阅源列表 |
| Feeds | `POST /feeds` | 创建订阅源 |
| Feeds | `GET /feeds/{id}` | 订阅源详情 |
| Feeds | `PUT /feeds/{id}` | 更新订阅源 |
| Feeds | `DELETE /feeds/{id}` | 删除订阅源 |
| Feeds | `POST /feeds/fetch-all` | 抓取所有订阅源 |
| Feeds | `POST /feeds/{id}/fetch` | 抓取单个订阅源 |
| Categories | `GET /feeds/categories/` | 分类列表 |
| Categories | `POST /feeds/categories/` | 创建分类 |
| Categories | `DELETE /feeds/categories/{id}` | 删除分类 |
| Articles | `GET /articles` | 文章列表 |
| Articles | `GET /articles/{id}` | 文章详情 |
| Articles | `PUT /articles/{id}/read` | 切换已读状态 |
| Articles | `PUT /articles/{id}/star` | 切换收藏状态 |
| OPML | `POST /opml/import` | 导入 OPML |
| OPML | `POST /opml/import-url` | 从 URL 导入 |
| OPML | `GET /opml/export` | 导出 OPML |

---

## Python 脚本使用

使用 `scripts/api_client.py` 可以通过命令行调用所有 API。

### 健康检查

```bash
python scripts/api_client.py health
```

### Feed 管理

```bash
# 列出所有订阅源
python scripts/api_client.py feeds list

# 创建订阅源
python scripts/api_client.py feeds create --url "https://example.com/feed.xml"

# 创建订阅源（指定标题和分类）
python scripts/api_client.py feeds create --url "https://example.com/feed.xml" --title "My Feed" --category-id 1

# 获取订阅源详情
python scripts/api_client.py feeds get 1

# 更新订阅源
python scripts/api_client.py feeds update 1 --title "New Title"

# 删除订阅源
python scripts/api_client.py feeds delete 1

# 抓取所有订阅源
python scripts/api_client.py feeds fetch-all

# 抓取单个订阅源
python scripts/api_client.py feeds fetch 1
```

### 分类管理

```bash
# 列出所有分类（树形结构）
python scripts/api_client.py categories list

# 创建分类
python scripts/api_client.py categories create --name "Technology"

# 创建子分类
python scripts/api_client.py categories create --name "AI" --parent-id 1

# 删除分类
python scripts/api_client.py categories delete 1
```

### 文章管理

```bash
# 列出文章（默认第 1 页，每页 20 条）
python scripts/api_client.py articles list

# 按订阅源筛选
python scripts/api_client.py articles list --feed-id 1

# 未读文章
python scripts/api_client.py articles list --unread

# 收藏文章
python scripts/api_client.py articles list --starred

# 搜索标题关键词
python scripts/api_client.py articles list --search "AI"

# 时间范围查询
python scripts/api_client.py articles list --start-time "2026-03-01" --end-time "2026-03-06"

# 组合查询：特定订阅源的未读文章
python scripts/api_client.py articles list --feed-id 1 --unread

# 组合查询：最近 7 天未读文章
python scripts/api_client.py articles list --start-time "2026-02-28" --unread

# 分页
python scripts/api_client.py articles list --page 2 --page-size 50

# 获取文章详情
python scripts/api_client.py articles get 1

# 切换已读状态
python scripts/api_client.py articles toggle-read 1

# 切换收藏状态
python scripts/api_client.py articles toggle-star 1
```

### OPML 导入导出

```bash
# 导出订阅
python scripts/api_client.py opml export -o subscriptions.opml

# 导入 OPML 文件
python scripts/api_client.py opml import subscriptions.opml

# 从 URL 导入
python scripts/api_client.py opml import-url "https://example.com/subscriptions.opml"
```

---

## 常见场景示例

### 场景 1：添加新的 RSS 订阅

```bash
# 1. 创建分类（可选）
python scripts/api_client.py categories create --name "Tech News"

# 2. 添加订阅源
python scripts/api_client.py feeds create --url "https://techcrunch.com/feed/" --category-id 1

# 3. 手动抓取新订阅源
python scripts/api_client.py feeds fetch 1
```

### 场景 2：查看今日未读文章

```bash
# 查看今日未读文章
python scripts/api_client.py articles list --unread --start-time "2026-03-06"

# 查看特定订阅源的今日未读文章
python scripts/api_client.py articles list --unread --feed-id 1 --start-time "2026-03-06"
```

### 场景 3：批量导入订阅

```bash
# 从 OPML 文件导入
python scripts/api_client.py opml import my-subscriptions.opml

# 从 URL 导入
python scripts/api_client.py opml import-url "https://example.com/feeds.opml"

# 抓取所有新导入的订阅源
python scripts/api_client.py feeds fetch-all
```

### 场景 4：搜索和筛选文章

```bash
# 搜索包含 "AI" 的文章
python scripts/api_client.py articles list --search "AI"

# 查看收藏的文章
python scripts/api_client.py articles list --starred

# 查看本周的文章
python scripts/api_client.py articles list --start-time "2026-03-03" --end-time "2026-03-10"

# 组合：搜索本周收藏的 AI 相关文章
python scripts/api_client.py articles list --search "AI" --starred --start-time "2026-03-03"
```

### 场景 5：管理文章状态

```bash
# 标记文章为已读
python scripts/api_client.py articles toggle-read 1

# 收藏文章
python scripts/api_client.py articles toggle-star 1

# 查看文章详情
python scripts/api_client.py articles get 1
```

---

## 时间查询说明

文章列表 API 支持时间范围查询：

| 参数 | 说明 |
|------|------|
| `start_time` | 起始时间，筛选 `published_at >= start_time` 的文章 |
| `end_time` | 结束时间，筛选 `published_at < end_time` 的文章 |

**时间格式**：
- ISO 8601: `2026-03-06T10:00:00`
- 日期: `2026-03-06`

**示例**：
```bash
# 今天
--start-time "2026-03-06" --end-time "2026-03-07"

# 本周
--start-time "2026-03-03" --end-time "2026-03-10"

# 本月
--start-time "2026-03-01" --end-time "2026-04-01"

# 某时间点之后
--start-time "2026-03-01T00:00:00"

# 某时间点之前
--end-time "2026-03-06T00:00:00"
```
