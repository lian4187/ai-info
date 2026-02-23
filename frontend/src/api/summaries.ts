import { apiClient } from './client'
import type { Summary, DigestReport } from '../types'

// ---------------------------------------------------------------------------
// Summary endpoints
// ---------------------------------------------------------------------------

/** Trigger AI summarization for a single article. Returns the new/existing Summary. */
export const summarizeArticle = (articleId: number): Promise<Summary> =>
  apiClient
    .post<Summary>(`/summaries/article/${articleId}`)
    .then((r) => r.data)

export interface BatchSummarizeResult {
  requested: number
  queued: number
  already_summarized: number
}

/** Submit a batch of article IDs for summarization */
export const batchSummarize = (
  articleIds: number[]
): Promise<BatchSummarizeResult> =>
  apiClient
    .post<BatchSummarizeResult>('/summaries/batch', { article_ids: articleIds })
    .then((r) => r.data)

/** Fetch the existing summary for an article (404 if none) */
export const getArticleSummary = (articleId: number): Promise<Summary> =>
  apiClient
    .get<Summary>(`/summaries/article/${articleId}`)
    .then((r) => r.data)

// ---------------------------------------------------------------------------
// Digest endpoints
// ---------------------------------------------------------------------------

export interface GetDigestsParams {
  period_type?: string
}

export const getDigests = (periodType?: string): Promise<DigestReport[]> => {
  const params: GetDigestsParams = {}
  if (periodType) params.period_type = periodType
  return apiClient
    .get<DigestReport[]>('/summaries/digests', { params })
    .then((r) => r.data)
}

export interface GenerateDigestParams {
  period_type: string
  start_date?: string
  end_date?: string
}

export const generateDigest = (
  data: GenerateDigestParams
): Promise<DigestReport> =>
  apiClient
    .post<DigestReport>('/summaries/digests/generate', data)
    .then((r) => r.data)

export const getDigest = (id: number): Promise<DigestReport> =>
  apiClient.get<DigestReport>(`/summaries/digests/${id}`).then((r) => r.data)
