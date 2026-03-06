# AI Info

**AI-powered RSS reader with automated article summarization and digest generation.**

基于 AI 的 RSS 阅读器，支持文章自动摘要和周期性 Digest 生成。

---

## Features / 功能特性

- **RSS Feed Management** — Subscribe, categorize, and auto-fetch feeds with conditional GET (ETag / Last-Modified)
  订阅、分类管理 RSS 源，支持条件请求减少带宽消耗
- **AI Summaries** — Summarize individual articles via Claude, Gemini, or any OpenAI-compatible API
  通过 Claude、Gemini 或 OpenAI 兼容接口为单篇文章生成摘要
- **Digest Reports** — Generate daily / weekly / monthly AI digest reports from summarized articles
  基于已摘要文章生成每日 / 每周 / 每月 Digest 报告
- **OPML Import & Export** — Migrate subscriptions in/out with standard OPML format
  通过标准 OPML 格式导入或导出订阅列表
- **Scheduled Tasks** — APScheduler background jobs for automatic feed polling
  APScheduler 定时任务自动抓取 Feed

---

## Tech Stack / 技术栈

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| State | TanStack Query + Zustand |
| Backend | FastAPI + SQLAlchemy 2 (async) + SQLite |
| Migrations | Alembic |
| Scheduler | APScheduler |
| LLM | Anthropic Claude / Google Gemini / OpenAI-compatible |

---

## Getting Started / 快速开始

### Prerequisites / 前置条件

- Node.js 18+
- Python 3.11+

### Backend

```bash
cd backend

# 安装 venv
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies / 安装依赖
pip install -e .

# Run database migrations / 执行数据库迁移
alembic upgrade head

# Start the server / 启动服务 (http://localhost:8000)
uvicorn app.main:app --reload
```

Copy `.env.example` to `.env` and adjust as needed:

```env
DATABASE_URL=sqlite+aiosqlite:///./ai_info.db
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend

```bash
cd frontend

# Install dependencies / 安装依赖
npm install

# Start dev server / 启动开发服务器 (http://localhost:5173)
npm run dev
```

Copy `.env.example` to `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

The frontend dev server proxies all `/api` requests to the backend automatically.
前端开发服务器会自动将 `/api` 请求代理到后端。

---

## Project Structure / 项目结构

```
ai-info/
├── frontend/               # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/          # Dashboard, Feeds, Articles, Digests, Settings
│   │   ├── components/     # Shared UI components (GlassCard, GlassModal, …)
│   │   ├── api/            # Axios API client
│   │   └── store/          # Zustand client state
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app, CORS, request logging middleware
│   │   ├── routers/        # feeds, articles, summaries, llm, tasks, opml
│   │   ├── services/       # feed_service, summary_service, digest_service, scheduler_service
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request / response schemas
│   │   └── llm/            # LLM provider abstraction (Anthropic, Gemini, OpenAI-compat)
│   └── alembic/            # Database migrations
│
└── .claude/
    └── skills/ui-ux-pro-max/   # UI/UX design intelligence skill for Claude Code
```

---

## API 文档

Base URL: `http://localhost:8000/api/v1`

### 1. 健康检查

#### GET `/health`

健康检查接口。

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

### 2. Feeds 订阅源管理

#### GET `/feeds`

获取所有订阅源列表。

**Query 参数：**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
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

#### POST `/feeds`

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
|---|---|---|---|
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
```json
{
  "id": 1,
  "url": "https://example.com/feed.xml",
  "title": "Example Feed",
  "description": "...",
  "site_url": "https://example.com",
  "category_id": null,
  "is_active": true,
  "fetch_interval_minutes": 120,
  "etag": null,
  "last_modified": null,
  "last_fetched_at": null,
  "created_at": "2026-03-06T12:00:00",
  "updated_at": "2026-03-06T12:00:00"
}
```

---

#### GET `/feeds/{feed_id}`

获取单个订阅源详情。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/feeds/1
```

**返回值：** 同上，单个对象

---

#### PUT `/feeds/{feed_id}`

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
|---|---|---|---|
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

#### DELETE `/feeds/{feed_id}`

删除订阅源。

**请求示例：**
```bash
curl -X DELETE http://localhost:8000/api/v1/feeds/1
```

**返回值：** `204 No Content`

---

#### POST `/feeds/fetch-all`

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

#### POST `/feeds/{feed_id}/fetch`

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

### 3. Feed Categories 分类管理

#### GET `/feeds/categories/`

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

#### POST `/feeds/categories/`

创建新分类。

**请求体：**
```json
{
  "name": "Technology",
  "parent_id": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
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

#### DELETE `/feeds/categories/{category_id}`

删除分类。

**请求示例：**
```bash
curl -X DELETE http://localhost:8000/api/v1/feeds/categories/1
```

**返回值：** `204 No Content`

---

### 4. Articles 文章管理

#### GET `/articles`

获取文章列表（分页、支持筛选）。

**Query 参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| feed_id | int | 否 | - | 按订阅源筛选 |
| is_read | bool | 否 | - | 按已读状态筛选 |
| is_starred | bool | 否 | - | 按收藏状态筛选 |
| search | string | 否 | - | 搜索标题关键词 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页数量（最大 200） |

**请求示例：**
```bash
curl "http://localhost:8000/api/v1/articles?page=1&page_size=10"
curl "http://localhost:8000/api/v1/articles?feed_id=1&is_read=false"
curl "http://localhost:8000/api/v1/articles?search=AI"
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

#### GET `/articles/{article_id}`

获取单篇文章详情。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/articles/1
```

**返回值：** 同上，单个对象

---

#### PUT `/articles/{article_id}/read`

切换文章已读状态。

**请求示例：**
```bash
curl -X PUT http://localhost:8000/api/v1/articles/1/read
```

**返回值：** 返回更新后的文章对象

---

#### PUT `/articles/{article_id}/star`

切换文章收藏状态。

**请求示例：**
```bash
curl -X PUT http://localhost:8000/api/v1/articles/1/star
```

**返回值：** 返回更新后的文章对象

---

### 5. Summaries 文章摘要

#### POST `/summaries/article/{article_id}`

为单篇文章生成摘要。

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/summaries/article/1
```

**返回值：** `201 Created`
```json
{
  "id": 1,
  "article_id": 1,
  "llm_provider": "anthropic",
  "llm_model": "claude-3-sonnet",
  "summary_text": "This article discusses...",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "token_usage": 500,
  "created_at": "2026-03-06T12:00:00"
}
```

---

#### GET `/summaries/article/{article_id}`

获取文章的已有摘要。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/summaries/article/1
```

**返回值：** 同上

---

#### POST `/summaries/batch`

批量生成文章摘要。

**请求体：**
```json
{
  "article_ids": [1, 2, 3],
  "llm_config_id": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| article_ids | int[] | 是 | 文章 ID 列表 |
| llm_config_id | int | 否 | LLM 配置 ID，默认使用系统默认配置 |

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/summaries/batch \
  -H "Content-Type: application/json" \
  -d '{"article_ids": [1, 2, 3]}'
```

**返回值：**
```json
[
  {
    "article_id": 1,
    "success": true,
    "summary_id": 1,
    "error": null
  },
  {
    "article_id": 2,
    "success": false,
    "summary_id": null,
    "error": "Article not found"
  }
]
```

---

### 6. Digests 周期性报告

#### POST `/summaries/digests/generate`

生成周期性摘要报告。

**请求体：**
```json
{
  "period_type": "daily",
  "start_date": "2026-03-05T00:00:00",
  "end_date": "2026-03-06T00:00:00",
  "llm_config_id": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| period_type | string | 是 | 周期类型：`daily`、`weekly`、`monthly` |
| start_date | datetime | 否 | 开始时间（ISO 8601），默认为最近完整周期 |
| end_date | datetime | 否 | 结束时间（ISO 8601），不填则根据 period_type 推断 |
| llm_config_id | int | 否 | LLM 配置 ID，默认使用系统默认配置 |

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/summaries/digests/generate \
  -H "Content-Type: application/json" \
  -d '{"period_type": "daily"}'
```

**返回值：** `201 Created`
```json
{
  "id": 1,
  "period_type": "daily",
  "period_start": "2026-03-05T00:00:00",
  "period_end": "2026-03-06T00:00:00",
  "content": "# Daily Digest\n\n## Top Stories\n...",
  "article_count": 10,
  "llm_provider": "anthropic",
  "llm_model": "claude-3-sonnet",
  "created_at": "2026-03-06T08:00:00"
}
```

---

#### GET `/summaries/digests`

获取所有摘要报告列表。

**Query 参数：**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| period_type | string | 否 | 按周期类型筛选：`daily`、`weekly`、`monthly` |

**请求示例：**
```bash
curl http://localhost:8000/api/v1/summaries/digests
curl "http://localhost:8000/api/v1/summaries/digests?period_type=weekly"
```

**返回值：** DigestReportResponse 列表

---

#### GET `/summaries/digests/{digest_id}`

获取单个摘要报告详情。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/summaries/digests/1
```

**返回值：** 单个 DigestReportResponse 对象

---

### 7. LLM Providers 大模型配置

#### GET `/llm/providers`

获取所有 LLM 配置列表。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/llm/providers
```

**返回值：**
```json
[
  {
    "id": 1,
    "provider_type": "anthropic",
    "display_name": "Claude",
    "api_key_masked": "****abcd",
    "base_url": null,
    "model_name": "claude-3-sonnet-20240229",
    "is_default": true,
    "temperature": 0.7,
    "max_tokens": 1024,
    "created_at": "2026-03-01T00:00:00",
    "updated_at": "2026-03-01T00:00:00"
  }
]
```

---

#### POST `/llm/providers`

创建新的 LLM 配置。

**请求体：**
```json
{
  "provider_type": "anthropic",
  "display_name": "Claude",
  "api_key": "sk-ant-xxxx",
  "base_url": null,
  "model_name": "claude-3-sonnet-20240229",
  "is_default": true,
  "temperature": 0.7,
  "max_tokens": 1024
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| provider_type | string | 是 | 提供商类型：`openai`、`anthropic`、`gemini`、`zhipu`、`doubao`、`minimax`、`openai_compat` |
| display_name | string | 是 | 显示名称 |
| api_key | string | 是 | API 密钥 |
| base_url | string | 否 | 自定义 API 地址（`openai_compat` 必填） |
| model_name | string | 是 | 模型名称 |
| is_default | bool | 否 | 是否为默认配置，默认 false |
| temperature | float | 否 | 温度参数，默认 0.7，范围 [0, 2] |
| max_tokens | int | 否 | 最大 token 数，默认 1024 |

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/llm/providers \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "anthropic",
    "display_name": "Claude",
    "api_key": "sk-ant-xxxx",
    "model_name": "claude-3-sonnet-20240229"
  }'
```

**返回值：** `201 Created`

---

#### PUT `/llm/providers/{config_id}`

更新 LLM 配置。

**请求体：**
```json
{
  "display_name": "New Name",
  "api_key": "new-key",
  "is_default": true,
  "temperature": 0.5
}
```

所有字段均为可选，只更新提供的字段。

**请求示例：**
```bash
curl -X PUT http://localhost:8000/api/v1/llm/providers/1 \
  -H "Content-Type: application/json" \
  -d '{"temperature": 0.5}'
```

---

#### DELETE `/llm/providers/{config_id}`

删除 LLM 配置。

**请求示例：**
```bash
curl -X DELETE http://localhost:8000/api/v1/llm/providers/1
```

**返回值：** `204 No Content`

---

#### POST `/llm/providers/{config_id}/test`

测试 LLM 配置连通性。

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/llm/providers/1/test
```

**返回值：**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

---

#### POST `/llm/providers/{config_id}/set-default`

设置指定配置为默认。

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/llm/providers/1/set-default
```

**返回值：** 返回更新后的配置对象

---

### 8. Tasks 定时任务

#### GET `/tasks`

获取所有定时任务列表。

**请求示例：**
```bash
curl http://localhost:8000/api/v1/tasks
```

**返回值：**
```json
[
  {
    "id": 1,
    "task_type": "fetch_feeds",
    "cron_expression": "0 */2 * * *",
    "is_enabled": true,
    "last_run_at": "2026-03-06T10:00:00",
    "created_at": "2026-03-01T00:00:00",
    "updated_at": "2026-03-06T10:00:00"
  }
]
```

---

#### POST `/tasks`

创建定时任务。

**请求体：**
```json
{
  "task_type": "fetch_feeds",
  "cron_expression": "0 */2 * * *",
  "is_enabled": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| task_type | string | 是 | 任务类型（唯一） |
| cron_expression | string | 是 | Cron 表达式 |
| is_enabled | bool | 否 | 是否启用，默认 true |

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"task_type": "fetch_feeds", "cron_expression": "0 */2 * * *"}'
```

---

#### PUT `/tasks/{task_id}`

更新定时任务。

**请求体：**
```json
{
  "cron_expression": "0 */4 * * *",
  "is_enabled": false
}
```

所有字段均为可选。

**请求示例：**
```bash
curl -X PUT http://localhost:8000/api/v1/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": false}'
```

---

#### POST `/tasks/{task_id}/run`

手动触发任务执行。

**请求示例：**
```bash
curl -X POST http://localhost:8000/api/v1/tasks/1/run
```

**返回值：**
```json
{
  "success": true,
  "message": "Task executed successfully"
}
```

---

#### GET `/tasks/{task_id}/logs`

获取任务执行日志。

**Query 参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| limit | int | 否 | 20 | 返回日志数量 |

**请求示例：**
```bash
curl http://localhost:8000/api/v1/tasks/1/logs?limit=10
```

**返回值：**
```json
[
  {
    "id": 1,
    "task_id": 1,
    "status": "success",
    "message": "Fetched 5 new articles",
    "started_at": "2026-03-06T10:00:00",
    "finished_at": "2026-03-06T10:00:05"
  }
]
```

---

### 9. OPML 导入导出

#### POST `/opml/import`

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

#### POST `/opml/import-url`

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

#### GET `/opml/export`

导出订阅为 OPML 文件。

**请求示例：**
```bash
curl -O http://localhost:8000/api/v1/opml/export
```

**返回值：** `application/xml` 格式的 OPML 文件，浏览器会自动下载为 `subscriptions.opml`

---

## LLM Provider Configuration / LLM 配置

Configure providers through the Settings page or directly via the API.
通过 Settings 页面或 API 配置 LLM 提供商。

Supported providers / 支持的提供商：

| Provider | `provider_type` |
|---|---|
| Anthropic Claude | `anthropic` |
| Google Gemini | `gemini` |
| OpenAI | `openai` |
| Zhipu AI / 智谱 | `zhipu` |
| Doubao / 豆包 | `doubao` |
| MiniMax | `minimax` |
| Any OpenAI-compatible endpoint | `openai_compat` |

---

## Development / 开发说明

### Frontend build

```bash
npm run build    # Type-check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

### Backend request logging

The backend logs every HTTP request with timestamps and elapsed time:

```
2026-02-23 14:30:01.234 [INFO] app.main - [IN ] POST /api/v1/summaries/digests/generate - client=127.0.0.1
2026-02-23 14:30:45.678 [INFO] app.main - [OUT] POST /api/v1/summaries/digests/generate - status=201 elapsed=44444ms
```

---

## License / 许可证

MIT
