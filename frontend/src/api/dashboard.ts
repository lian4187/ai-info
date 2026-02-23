import { apiClient } from './client'
import type { Article, DigestReport } from '../types'

export interface DashboardStats {
  active_feeds: number
  total_articles: number
  articles_today: number
  total_summaries: number
  total_digests: number
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [feedsRes, articlesRes, digestsRes] = await Promise.all([
    apiClient.get('/feeds/'),
    apiClient.get('/articles/', { params: { page: 1, page_size: 1 } }),
    apiClient.get('/summaries/digests'),
  ])

  const feeds = feedsRes.data
  const activeFeeds = Array.isArray(feeds) ? feeds.filter((f: { is_active: boolean }) => f.is_active).length : 0
  const totalArticles = articlesRes.data?.total ?? 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayArticlesRes = await apiClient.get('/articles/', {
    params: { page: 1, page_size: 1 },
  })
  const articlesToday = todayArticlesRes.data?.total ?? 0

  const digests = Array.isArray(digestsRes.data) ? digestsRes.data : []

  return {
    active_feeds: activeFeeds,
    total_articles: totalArticles,
    articles_today: articlesToday,
    total_summaries: 0,
    total_digests: digests.length,
  }
}

export const getRecentArticles = async (limit = 5): Promise<Article[]> => {
  const res = await apiClient.get('/articles/', {
    params: { page: 1, page_size: limit },
  })
  return res.data?.items ?? []
}

export const getRecentDigests = async (limit = 3): Promise<DigestReport[]> => {
  const res = await apiClient.get('/summaries/digests')
  const digests = Array.isArray(res.data) ? res.data : []
  return digests.slice(0, limit)
}
