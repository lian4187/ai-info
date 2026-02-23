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

## API Overview / API 概览

Base URL: `http://localhost:8000/api/v1`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET/POST | `/feeds` | List / create feeds |
| POST | `/feeds/fetch-all` | Manually trigger all feeds |
| GET | `/articles` | List articles with filters |
| POST | `/summaries/article/{id}` | Summarize an article |
| POST | `/summaries/digests/generate` | Generate a digest report |
| GET | `/summaries/digests` | List digest reports |
| GET/POST | `/llm/providers` | Manage LLM provider configs |
| POST | `/opml/import` | Import OPML file |
| GET | `/opml/export` | Export subscriptions as OPML |

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
