import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Newspaper, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAppStore } from '../store/appStore'
import { GlassButton, EmptyState, LoadingSkeleton } from '../components/common'
import {
  ArticleCard,
  ArticleDetail,
  ArticleFilters,
} from '../components/articles'
import type { ArticleFilterState } from '../components/articles'
import {
  getArticles,
  toggleArticleRead,
  toggleArticleStar,
} from '../api/articles'
import { summarizeArticle, batchSummarize } from '../api/summaries'
import { getFeeds } from '../api/feeds'
import type { Article, Summary } from '../types'

const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToQueryParams(
  filters: ArticleFilterState,
  page: number
): Parameters<typeof getArticles>[0] {
  const params: Parameters<typeof getArticles>[0] = {
    page,
    page_size: PAGE_SIZE,
  }

  if (filters.search) params.search = filters.search
  if (filters.feed_id) params.feed_id = Number(filters.feed_id)
  if (filters.read_filter === 'read') params.is_read = true
  if (filters.read_filter === 'unread') params.is_read = false
  if (filters.starred_only) params.is_starred = true

  return params
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Articles() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync page title
  useEffect(() => {
    setCurrentPage('Articles')
  }, [setCurrentPage])

  // ---------------------------------------------------------------------------
  // Filter state — initialise feed_id from URL param (Feeds page link)
  // ---------------------------------------------------------------------------
  const [filters, setFilters] = useState<ArticleFilterState>({
    search: '',
    feed_id: searchParams.get('feed_id') ?? '',
    read_filter: '',
    starred_only: false,
  })
  const [page, setPage] = useState(1)

  // Keep URL in sync when feed_id filter changes
  useEffect(() => {
    if (filters.feed_id) {
      setSearchParams({ feed_id: filters.feed_id }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [filters.feed_id, setSearchParams])

  // Reset to page 1 on filter change
  const handleFiltersChange = useCallback((next: ArticleFilterState) => {
    setFilters(next)
    setPage(1)
  }, [])

  // ---------------------------------------------------------------------------
  // Selected article (detail modal)
  // ---------------------------------------------------------------------------
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [summarizingId, setSummarizingId] = useState<number | null>(null)

  // Local cache of summaries fetched during this session, keyed by article id
  const [summariesMap, setSummariesMap] = useState<Record<number, Summary>>({})

  // ---------------------------------------------------------------------------
  // Data queries
  // ---------------------------------------------------------------------------

  const queryKey = ['articles', filters, page] as const

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => getArticles(filtersToQueryParams(filters, page)),
    placeholderData: (prev) => prev,
  })

  const { data: feeds = [] } = useQuery({
    queryKey: ['feeds'],
    queryFn: () => getFeeds(),
  })

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const readMutation = useMutation({
    mutationFn: toggleArticleRead,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      // Keep selected article in sync
      if (selectedArticle?.id === updated.id) {
        setSelectedArticle(updated)
      }
    },
  })

  const starMutation = useMutation({
    mutationFn: toggleArticleStar,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      if (selectedArticle?.id === updated.id) {
        setSelectedArticle(updated)
      }
    },
  })

  // Single-article summarize
  const handleSummarizeSingle = useCallback(
    async (id: number) => {
      setSummarizingId(id)
      try {
        const summary = await summarizeArticle(id)
        toast.success('Summary generated')
        // Store summary in local map
        setSummariesMap((prev) => ({ ...prev, [id]: summary }))
      } finally {
        setSummarizingId(null)
      }
    },
    []
  )

  // Summarize from detail modal (returns promise for the modal loading state)
  const handleSummarizeFromDetail = useCallback(
    (id: number) => handleSummarizeSingle(id),
    [handleSummarizeSingle]
  )

  // Batch summarize visible unsummarized articles
  const [isBatchSummarizing, setIsBatchSummarizing] = useState(false)

  const handleBatchSummarize = useCallback(async () => {
    const unsummarized = (data?.items ?? [])
      .filter((a) => !summariesMap[a.id])
      .map((a) => a.id)

    if (unsummarized.length === 0) {
      toast('All visible articles already have summaries', { icon: 'ℹ️' })
      return
    }

    setIsBatchSummarizing(true)
    try {
      const result = await batchSummarize(unsummarized)
      toast.success(
        `Queued ${result.queued} article${result.queued !== 1 ? 's' : ''} for summarization`
      )
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    } finally {
      setIsBatchSummarizing(false)
    }
  }, [data?.items, summariesMap, queryClient])

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const hasActiveFilters = useMemo(
    () =>
      !!filters.search ||
      !!filters.feed_id ||
      !!filters.read_filter ||
      filters.starred_only,
    [filters]
  )

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-white/90">Articles</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Browse and read aggregated articles
        </p>
      </div>

      {/* Filters */}
      <ArticleFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        feeds={feeds}
        onBatchSummarize={handleBatchSummarize}
        isBatchSummarizing={isBatchSummarizing}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Result count */}
      {data && (
        <p className="text-xs text-white/35" aria-live="polite">
          {data.total === 0
            ? 'No articles found'
            : `${data.total.toLocaleString()} article${data.total !== 1 ? 's' : ''}`}
          {data.total > 0 && totalPages > 1
            ? ` — page ${page} of ${totalPages}`
            : ''}
        </p>
      )}

      {/* Content area */}
      {isLoading ? (
        <LoadingSkeleton variant="card" count={6} className="grid-cols-1 sm:grid-cols-2" />
      ) : isError ? (
        <div
          className="flex items-center justify-center py-16 text-sm text-red-400"
          role="alert"
        >
          Failed to load articles. Please try again.
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={hasActiveFilters ? 'No articles match your filters' : 'No articles yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Once you add RSS feeds, articles will appear here automatically.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data!.items.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              summary={summariesMap[article.id]}
              onSelect={setSelectedArticle}
              onToggleRead={(id) => readMutation.mutate(id)}
              onToggleStar={(id) => starMutation.mutate(id)}
              onSummarize={handleSummarizeSingle}
              summarizingId={summarizingId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-3 pt-2"
          aria-label="Pagination"
        >
          <GlassButton
            variant="ghost"
            size="sm"
            icon={<ChevronLeft size={15} />}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          />

          <span className="text-sm text-white/50 min-w-[6rem] text-center">
            Page {page} of {totalPages}
          </span>

          <GlassButton
            variant="ghost"
            size="sm"
            icon={<ChevronRight size={15} />}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          />
        </div>
      )}

      {/* Article detail modal */}
      <ArticleDetail
        article={selectedArticle}
        summary={selectedArticle ? summariesMap[selectedArticle.id] : null}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onToggleRead={(id) => readMutation.mutate(id)}
        onToggleStar={(id) => starMutation.mutate(id)}
        onSummarize={handleSummarizeFromDetail}
      />
    </div>
  )
}
