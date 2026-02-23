import { apiClient } from './client'
import type { RSSFeed, FeedCategory } from '../types'

// ---------------------------------------------------------------------------
// Feed endpoints
// ---------------------------------------------------------------------------

export const getFeeds = (categoryId?: number): Promise<RSSFeed[]> => {
  const params = categoryId != null ? { category_id: categoryId } : {}
  return apiClient.get<RSSFeed[]>('/feeds', { params }).then((r) => r.data)
}

export const createFeed = (data: {
  url: string
  title?: string
  category_id?: number
  fetch_interval_minutes?: number
}): Promise<RSSFeed> =>
  apiClient.post<RSSFeed>('/feeds', data).then((r) => r.data)

export const updateFeed = (
  id: number,
  data: Partial<RSSFeed>
): Promise<RSSFeed> =>
  apiClient.put<RSSFeed>(`/feeds/${id}`, data).then((r) => r.data)

export const deleteFeed = (id: number): Promise<void> =>
  apiClient.delete(`/feeds/${id}`).then(() => undefined)

export const fetchFeed = (id: number): Promise<{ articles_fetched: number }> =>
  apiClient
    .post<{ articles_fetched: number }>(`/feeds/${id}/fetch`)
    .then((r) => r.data)

export const fetchAllFeeds = (): Promise<{ feeds_updated: number }> =>
  apiClient
    .post<{ feeds_updated: number }>('/feeds/fetch-all')
    .then((r) => r.data)

// ---------------------------------------------------------------------------
// Category endpoints
// ---------------------------------------------------------------------------

export const getCategories = (): Promise<FeedCategory[]> =>
  apiClient.get<FeedCategory[]>('/feeds/categories/').then((r) => r.data)

export const createCategory = (data: {
  name: string
  parent_id?: number
}): Promise<FeedCategory> =>
  apiClient.post<FeedCategory>('/feeds/categories/', data).then((r) => r.data)

export const deleteCategory = (id: number): Promise<void> =>
  apiClient.delete(`/feeds/categories/${id}`).then(() => undefined)

// ---------------------------------------------------------------------------
// OPML endpoints
// ---------------------------------------------------------------------------

export interface OPMLImportResult {
  feeds_created: number
  categories_created: number
  feeds_skipped: number
}

export const importOPML = (file: File): Promise<OPMLImportResult> => {
  const form = new FormData()
  form.append('file', file)
  return apiClient
    .post<OPMLImportResult>('/opml/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const importOPMLFromURL = (url: string): Promise<OPMLImportResult> =>
  apiClient
    .post<OPMLImportResult>('/opml/import-url', { url })
    .then((r) => r.data)

export const exportOPML = (): Promise<string> =>
  apiClient
    .get<string>('/opml/export', { responseType: 'text' })
    .then((r) => r.data)
