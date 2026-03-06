# 文章时间范围过滤功能 Spec

## Why
用户需要按照文章发布时间（published_at）筛选文章，例如查看某一天、某一周或某个时间范围内的文章，以便更好地管理和浏览历史文章。

## What Changes
- 在 `GET /api/v1/articles` 接口新增两个可选 Query 参数：`start_time` 和 `end_time`
- 支持按 ISO 8601 格式的时间范围过滤文章
- 更新 README.md 中的 API 文档

## Impact
- Affected code: 
  - `backend/app/routers/articles.py` - 添加时间过滤参数和逻辑
  - `readme.md` - 更新 API 文档

## ADDED Requirements

### Requirement: 文章时间范围过滤
系统 SHALL 支持通过 `start_time` 和 `end_time` 参数按文章发布时间过滤文章列表。

#### Scenario: 使用 start_time 过滤
- **WHEN** 用户请求 `GET /articles?start_time=2026-03-01T00:00:00`
- **THEN** 系统返回 `published_at >= start_time` 的文章

#### Scenario: 使用 end_time 过滤
- **WHEN** 用户请求 `GET /articles?end_time=2026-03-06T00:00:00`
- **THEN** 系统返回 `published_at < end_time` 的文章

#### Scenario: 使用时间范围过滤
- **WHEN** 用户请求 `GET /articles?start_time=2026-03-01T00:00:00&end_time=2026-03-06T00:00:00`
- **THEN** 系统返回 `published_at` 在指定时间范围内的文章

#### Scenario: 时间参数与其他过滤条件组合
- **WHEN** 用户请求 `GET /articles?start_time=2026-03-01&feed_id=1&is_read=false`
- **THEN** 系统返回满足所有过滤条件的文章（AND 逻辑）

#### Scenario: 处理 published_at 为 null 的文章
- **WHEN** 文章的 `published_at` 字段为 null
- **THEN** 该文章不包含在时间过滤结果中（因为无法判断时间范围）

### Requirement: 参数格式
- `start_time`: 可选，ISO 8601 格式的日期时间字符串（如 `2026-03-01T00:00:00` 或 `2026-03-01`）
- `end_time`: 可选，ISO 8601 格式的日期时间字符串
- 两个参数均为可选，可单独使用或组合使用
