# 计划：为 AI Info 后端服务创建配套 Skill

## 目标

创建一个 Skill，让 AI Agent 能够方便地调用 AI Info 后端服务的 API，实现 RSS 订阅管理和文章浏览等功能。

## 背景

AI Info 是一个基于 AI 的 RSS 阅读器，本 Skill 聚焦于核心的订阅管理功能：
- RSS Feed 管理（订阅、分类、自动抓取）
- 文章管理（列表、筛选、已读/收藏状态、时间范围查询）
- OPML 导入导出

## Skill 设计

### 文件结构
```
skills/RSS-Local-Reader/
├── SKILL.md              # Skill 主文档
├── references/
│   └── api.md            # API 参考文档（独立文件）
└── scripts/
    └── api_client.py     # Python API 客户端脚本
```

### SKILL.md 内容结构

1. **YAML Frontmatter**
   - name: `RSS-Local-Reader`
   - description: 描述 Skill 的功能和适用场景

2. **概述**
   - AI Info 服务简介
   - 功能范围

3. **前置条件**
   - 后端服务启动方式
   - 环境变量配置

4. **API 参考**
   - 引用 `references/api.md` 文档

5. **Python 脚本使用**
   - 命令行接口说明
   - 常用命令示例

6. **常见场景示例**
   - 订阅管理场景
   - 文章查询场景
   - OPML 导入导出场景

### references/api.md 内容结构

1. **概述**
   - Base URL
   - 通用响应格式

2. **健康检查**
   - `GET /api/v1/health`

3. **订阅源管理 (Feeds)**
   - `GET /api/v1/feeds` - 订阅源列表
   - `POST /api/v1/feeds` - 创建订阅源
   - `GET /api/v1/feeds/{id}` - 订阅源详情
   - `PUT /api/v1/feeds/{id}` - 更新订阅源
   - `DELETE /api/v1/feeds/{id}` - 删除订阅源
   - `POST /api/v1/feeds/fetch-all` - 抓取所有订阅源
   - `POST /api/v1/feeds/{id}/fetch` - 抓取单个订阅源

4. **分类管理 (Categories)**
   - `GET /api/v1/feeds/categories/` - 分类列表
   - `POST /api/v1/feeds/categories/` - 创建分类
   - `DELETE /api/v1/feeds/categories/{id}` - 删除分类

5. **文章管理 (Articles)**
   - `GET /api/v1/articles` - 文章列表（详细参数说明和示例）
   - `GET /api/v1/articles/{id}` - 文章详情
   - `PUT /api/v1/articles/{id}/read` - 切换已读状态
   - `PUT /api/v1/articles/{id}/star` - 切换收藏状态

6. **OPML 导入导出**
   - `POST /api/v1/opml/import` - 导入 OPML
   - `POST /api/v1/opml/import-url` - 从 URL 导入
   - `GET /api/v1/opml/export` - 导出 OPML

### 文章管理详细说明（在 api.md 中）

#### 文章列表 API 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `feed_id` | int | 按订阅源筛选 |
| `is_read` | bool | 按已读状态筛选 |
| `is_starred` | bool | 按收藏状态筛选 |
| `search` | string | 搜索标题关键词 |
| `start_time` | datetime | 起始时间（ISO 8601），筛选 `published_at >= start_time` |
| `end_time` | datetime | 结束时间（ISO 8601），筛选 `published_at < end_time` |
| `page` | int | 页码（默认 1） |
| `page_size` | int | 每页数量（默认 20，最大 200） |

#### 时间查询示例

```bash
# 查询今天的文章
python scripts/api_client.py articles list --start-time "2026-03-06T00:00:00" --end-time "2026-03-07T00:00:00"

# 查询本周文章
python scripts/api_client.py articles list --start-time "2026-03-03" --end-time "2026-03-10"

# 查询本月文章
python scripts/api_client.py articles list --start-time "2026-03-01" --end-time "2026-04-01"

# 组合查询：最近 7 天未读文章
python scripts/api_client.py articles list --start-time "2026-02-28" --unread

# 组合查询：特定订阅源上周文章
python scripts/api_client.py articles list --feed-id 1 --start-time "2026-02-24" --end-time "2026-03-03"
```

#### 常见文章查询场景

| 场景 | 命令 |
|------|------|
| 所有未读文章 | `articles list --unread` |
| 所有收藏文章 | `articles list --starred` |
| 特定订阅源文章 | `articles list --feed-id 1` |
| 搜索标题关键词 | `articles list --search "AI"` |
| 今日未读文章 | `articles list --unread --start-time "2026-03-06"` |
| 本周收藏文章 | `articles list --starred --start-time "2026-03-03"` |
| 最近 3 天某订阅源文章 | `articles list --feed-id 1 --start-time "2026-03-03"` |
| 上月所有文章 | `articles list --start-time "2026-02-01" --end-time "2026-03-01"` |

### Python 脚本设计

`scripts/api_client.py` 将提供以下功能：

1. **命令行接口**
   - 支持所有 API 端点的调用
   - 支持 JSON 输出格式化
   - 支持自定义后端地址
   - 支持时间范围查询

2. **核心命令**
   ```bash
   # 健康检查
   python scripts/api_client.py health

   # Feed 管理
   python scripts/api_client.py feeds list
   python scripts/api_client.py feeds create --url "https://example.com/feed.xml"
   python scripts/api_client.py feeds get 1
   python scripts/api_client.py feeds update 1 --title "New Title"
   python scripts/api_client.py feeds delete 1
   python scripts/api_client.py feeds fetch-all
   python scripts/api_client.py feeds fetch 1

   # 分类管理
   python scripts/api_client.py categories list
   python scripts/api_client.py categories create --name "Technology"
   python scripts/api_client.py categories delete 1

   # 文章管理
   python scripts/api_client.py articles list
   python scripts/api_client.py articles list --feed-id 1 --unread
   python scripts/api_client.py articles list --starred
   python scripts/api_client.py articles list --search "AI"
   python scripts/api_client.py articles list --start-time "2026-03-01" --end-time "2026-03-06"
   python scripts/api_client.py articles get 1
   python scripts/api_client.py articles toggle-read 1
   python scripts/api_client.py articles toggle-star 1

   # OPML
   python scripts/api_client.py opml export -o subscriptions.opml
   python scripts/api_client.py opml import subscriptions.opml
   python scripts/api_client.py opml import-url "https://example.com/opml"
   ```

3. **环境变量支持**
   - `AI_INFO_API_URL`：后端 API 地址（默认 `http://localhost:8000`）

## 实施步骤

1. **创建目录结构**
   - 创建 `skills/RSS-Local-Reader/` 目录
   - 创建 `references/` 子目录
   - 创建 `scripts/` 子目录

2. **编写 references/api.md**
   - 完整的 API 端点文档
   - 请求/响应示例
   - 文章管理详细示例（包含时间查询）

3. **编写 SKILL.md**
   - YAML frontmatter（name: `RSS-Local-Reader`）
   - 概述和前置条件
   - 引用 `references/api.md`
   - Python 脚本使用说明
   - 常见场景示例

4. **编写 Python 脚本**
   - `api_client.py`：完整的 CLI 工具
   - 使用标准库 `urllib`（避免外部依赖）
   - 支持所有精简后的 API 端点
   - 支持时间范围查询参数

5. **验证**
   - 确保脚本可执行
   - 确保 API 端点与后端一致

## 预期成果

1. **SKILL.md**：Skill 主文档，引用 API 文档
2. **references/api.md**：独立的 API 参考文档，包含丰富的文章管理示例
3. **scripts/api_client.py**：功能完整的 Python CLI 工具，支持时间查询
