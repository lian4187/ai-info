import { apiClient } from './client'
import type { Article, PaginatedResponse } from '../types'

// ---------------------------------------------------------------------------
// Article query params
// ---------------------------------------------------------------------------

export interface GetArticlesParams {
  page?: number
  page_size?: number
  feed_id?: number
  is_read?: boolean
  is_starred?: boolean
  search?: string
}

// ---------------------------------------------------------------------------
// Article endpoints
// ---------------------------------------------------------------------------

export const getArticles = (
  params: GetArticlesParams = {}
): Promise<PaginatedResponse<Article>> =>
  apiClient
    .get<PaginatedResponse<Article>>('/articles', { params })
    .then((r) => r.data)

export const getArticle = (id: number): Promise<Article> =>
  apiClient.get<Article>(`/articles/${id}`).then((r) => r.data)

/** Toggle read status — backend flips the current state and returns updated article */
export const toggleArticleRead = (id: number): Promise<Article> =>
  apiClient.put<Article>(`/articles/${id}/read`).then((r) => r.data)

/** Toggle star status — backend flips the current state and returns updated article */
export const toggleArticleStar = (id: number): Promise<Article> =>
  apiClient.put<Article>(`/articles/${id}/star`).then((r) => r.data)
