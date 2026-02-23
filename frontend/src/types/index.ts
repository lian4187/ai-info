// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ---------------------------------------------------------------------------
// Feed Category
// ---------------------------------------------------------------------------

export interface FeedCategory {
  id: number
  name: string
  parent_id: number | null
  created_at: string
  children?: FeedCategory[]
}

// ---------------------------------------------------------------------------
// RSS Feed
// ---------------------------------------------------------------------------

export interface RSSFeed {
  id: number
  url: string
  title: string
  description?: string | null
  site_url?: string | null
  category_id?: number | null
  is_active: boolean
  fetch_interval_minutes: number
  etag?: string | null
  last_modified?: string | null
  last_fetched_at?: string | null
  created_at: string
  updated_at: string
  article_count: number  // from FeedWithArticleCount
}

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------

export interface Article {
  id: number
  feed_id: number
  guid: string
  title: string
  url: string
  author?: string | null
  content: string
  published_at?: string | null
  is_read: boolean
  is_starred: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Summary (AI-generated article summary)
// ---------------------------------------------------------------------------

export interface Summary {
  id: number
  article_id: number
  llm_provider: string
  llm_model: string
  summary_text: string
  key_points: string[] | null
  token_usage: number | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Digest Report
// ---------------------------------------------------------------------------

export type DigestPeriodType = 'daily' | 'weekly' | 'monthly'

export interface DigestReport {
  id: number
  period_type: DigestPeriodType
  period_start: string
  period_end: string
  content: string
  article_count: number
  llm_provider: string
  llm_model: string
  created_at: string
}

// ---------------------------------------------------------------------------
// LLM Provider Configuration
// ---------------------------------------------------------------------------

export type LLMProviderType = 'openai' | 'anthropic' | 'zhipu' | 'doubao' | 'minimax' | 'openai_compat' | 'gemini'

export interface LLMProviderConfig {
  id: number
  provider_type: LLMProviderType
  display_name: string
  api_key_masked: string
  base_url?: string | null
  model_name: string
  is_default: boolean
  temperature: number
  max_tokens: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Scheduled Task
// ---------------------------------------------------------------------------

export interface ScheduledTask {
  id: number
  task_type: string
  cron_expression: string
  is_enabled: boolean
  last_run_at?: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Task Log
// ---------------------------------------------------------------------------

export interface TaskLog {
  id: number
  task_id: number
  status: 'success' | 'failed'
  message?: string | null
  started_at: string
  finished_at: string
}

// ---------------------------------------------------------------------------
// API request types
// ---------------------------------------------------------------------------

export interface DigestGenerateRequest {
  period_type: string
  start_date?: string | null
  end_date?: string | null
  llm_config_id?: number | null
}

export interface BatchSummarizeRequest {
  article_ids: number[]
  llm_config_id?: number | null
}

export interface BatchSummarizeResult {
  article_id: number
  success: boolean
  summary_id?: number | null
  error?: string | null
}
