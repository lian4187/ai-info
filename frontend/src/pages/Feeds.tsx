import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Rss,
  Search,
  Upload,
  Download,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react'
import {
  GlassButton,
  GlassInput,
  GlassCard,
  EmptyState,
  LoadingSkeleton,
} from '../components/common'
import {
  FeedCard,
  AddFeedModal,
  EditFeedModal,
  OPMLImport,
  CategoryTree,
} from '../components/feeds'
import { getFeeds, getCategories, fetchAllFeeds, exportOPML } from '../api/feeds'
import { useAppStore } from '../store/appStore'
import type { RSSFeed, FeedCategory } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCategoryMap(categories: FeedCategory[]): Map<number, string> {
  return new Map(categories.map((c) => [c.id, c.name]))
}

function downloadXML(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Feeds() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const queryClient = useQueryClient()

  useEffect(() => {
    setCurrentPage('Feeds')
  }, [setCurrentPage])

  // ---------------------------------------------------------------------------
  // UI state
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editFeed, setEditFeed] = useState<RSSFeed | null>(null)
  const [showOPMLImport, setShowOPMLImport] = useState(false)

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const {
    data: feeds = [],
    isLoading: feedsLoading,
    isError: feedsError,
  } = useQuery({
    queryKey: ['feeds'],
    queryFn: () => getFeeds(),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const { mutate: doFetchAll, isPending: fetchingAll } = useMutation({
    mutationFn: fetchAllFeeds,
    onSuccess: (data) => {
      toast.success(`Updated ${data.feeds_updated} feeds`)
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })

  const { mutate: doExport, isPending: exporting } = useMutation({
    mutationFn: exportOPML,
    onSuccess: (xml) => {
      downloadXML(xml, 'feeds.opml')
      toast.success('OPML exported')
    },
  })

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories])

  const filteredFeeds = useMemo(() => {
    const q = search.trim().toLowerCase()
    return feeds.filter((feed) => {
      const matchesCategory =
        selectedCategoryId === null || feed.category_id === selectedCategoryId
      const matchesSearch =
        !q ||
        feed.title.toLowerCase().includes(q) ||
        feed.url.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [feeds, selectedCategoryId, search])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full gap-0">
      {/* ------------------------------------------------------------------ */}
      {/* Top bar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white/90">RSS Feeds</h2>
            <p className="text-sm text-white/50 mt-0.5">
              {feeds.length} feed{feeds.length !== 1 ? 's' : ''} across{' '}
              {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              loading={fetchingAll}
              onClick={() => doFetchAll()}
            >
              Fetch All
            </GlassButton>

            <GlassButton
              variant="ghost"
              size="sm"
              icon={<Download size={14} />}
              loading={exporting}
              onClick={() => doExport()}
            >
              Export OPML
            </GlassButton>

            <GlassButton
              variant="secondary"
              size="sm"
              icon={<Upload size={14} />}
              onClick={() => setShowOPMLImport((v) => !v)}
            >
              Import OPML
            </GlassButton>

            <GlassButton
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowAddModal(true)}
            >
              Add Feed
            </GlassButton>
          </div>
        </div>

        {/* OPML import panel */}
        {showOPMLImport && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOPMLImport(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
              aria-label="Close OPML import panel"
            >
              <X size={15} aria-hidden="true" />
            </button>
            <OPMLImport />
          </div>
        )}

        {/* Search bar */}
        <GlassInput
          placeholder="Search feeds by title or URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search feeds"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main layout: sidebar + grid                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-6 min-h-0 flex-1">
        {/* Sidebar */}
        <aside
          className="w-56 shrink-0 flex flex-col gap-4"
          aria-label="Category sidebar"
        >
          <GlassCard className="p-4">
            <CategoryTree
              categories={categories}
              feeds={feeds}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
            />
          </GlassCard>
        </aside>

        {/* Feed grid */}
        <main className="flex-1 min-w-0">
          {feedsError ? (
            /* Error state */
            <GlassCard className="flex flex-col items-center justify-center py-16 gap-4">
              <Rss size={40} className="text-red-400/50" aria-hidden="true" />
              <div className="text-center">
                <p className="text-white/70 font-medium">Failed to load feeds</p>
                <p className="text-white/40 text-sm mt-1">
                  Check your connection and try again.
                </p>
              </div>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['feeds'] })
                }
              >
                Retry
              </GlassButton>
            </GlassCard>
          ) : feedsLoading ? (
            /* Loading state */
            <LoadingSkeleton variant="card" count={6} className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />
          ) : filteredFeeds.length === 0 ? (
            /* Empty state */
            <GlassCard>
              <EmptyState
                icon={Rss}
                title={
                  search || selectedCategoryId !== null
                    ? 'No feeds match your filters'
                    : 'No feeds yet'
                }
                description={
                  search || selectedCategoryId !== null
                    ? 'Try adjusting your search or selecting a different category.'
                    : 'Add your first RSS feed to start aggregating AI news from around the web.'
                }
                action={
                  search || selectedCategoryId !== null ? (
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch('')
                        setSelectedCategoryId(null)
                      }}
                    >
                      Clear filters
                    </GlassButton>
                  ) : (
                    <GlassButton
                      variant="primary"
                      icon={<Plus size={15} />}
                      onClick={() => setShowAddModal(true)}
                    >
                      Add Your First Feed
                    </GlassButton>
                  )
                }
              />
            </GlassCard>
          ) : (
            /* Feed grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFeeds.map((feed) => (
                <FeedCard
                  key={feed.id}
                  feed={feed}
                  categoryName={
                    feed.category_id != null
                      ? categoryMap.get(feed.category_id)
                      : undefined
                  }
                  onEdit={setEditFeed}
                />
              ))}
            </div>
          )}

          {/* Filtered count hint */}
          {!feedsLoading && !feedsError && filteredFeeds.length > 0 && (search || selectedCategoryId !== null) && (
            <p className="mt-4 text-xs text-white/30 flex items-center gap-2">
              <Search size={12} aria-hidden="true" />
              Showing {filteredFeeds.length} of {feeds.length} feeds
              <button
                type="button"
                onClick={() => { setSearch(''); setSelectedCategoryId(null) }}
                className="underline underline-offset-2 hover:text-white/60 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </p>
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modals                                                               */}
      {/* ------------------------------------------------------------------ */}
      <AddFeedModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        categories={categories}
      />

      <EditFeedModal
        feed={editFeed}
        isOpen={editFeed !== null}
        onClose={() => setEditFeed(null)}
        categories={categories}
      />
    </div>
  )
}
