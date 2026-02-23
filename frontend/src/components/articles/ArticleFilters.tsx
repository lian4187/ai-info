import { Search, X, Star, Sparkles } from 'lucide-react'
import { GlassInput, GlassSelect, GlassButton } from '../common'
import type { RSSFeed } from '../../types'

// ---------------------------------------------------------------------------
// Filter state type (owned by the parent page)
// ---------------------------------------------------------------------------

export interface ArticleFilterState {
  search: string
  feed_id: string        // empty string = all feeds
  read_filter: string    // '' | 'read' | 'unread'
  starred_only: boolean
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ArticleFiltersProps {
  filters: ArticleFilterState
  onFiltersChange: (filters: ArticleFilterState) => void
  feeds: RSSFeed[]
  onBatchSummarize: () => void
  isBatchSummarizing: boolean
  hasActiveFilters: boolean
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const READ_OPTIONS = [
  { value: '', label: 'All articles' },
  { value: 'unread', label: 'Unread only' },
  { value: 'read', label: 'Read only' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleFilters({
  filters,
  onFiltersChange,
  feeds,
  onBatchSummarize,
  isBatchSummarizing,
  hasActiveFilters,
}: ArticleFiltersProps) {
  const feedOptions = [
    { value: '', label: 'All feeds' },
    ...feeds.map((f) => ({ value: String(f.id), label: f.title })),
  ]

  const update = (partial: Partial<ArticleFilterState>) =>
    onFiltersChange({ ...filters, ...partial })

  const clearFilters = () =>
    onFiltersChange({ search: '', feed_id: '', read_filter: '', starred_only: false })

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: search + feed + read filter */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-10"
            aria-hidden="true"
          />
          <GlassInput
            type="search"
            placeholder="Search articles…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9"
            aria-label="Search articles by title"
          />
        </div>

        {/* Feed selector */}
        <div className="w-48 shrink-0">
          <GlassSelect
            options={feedOptions}
            value={filters.feed_id}
            onChange={(val) => update({ feed_id: val })}
          />
        </div>

        {/* Read/Unread */}
        <div className="w-40 shrink-0">
          <GlassSelect
            options={READ_OPTIONS}
            value={filters.read_filter}
            onChange={(val) => update({ read_filter: val })}
          />
        </div>
      </div>

      {/* Row 2: starred toggle + batch action + clear */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Starred only toggle */}
        <button
          onClick={() => update({ starred_only: !filters.starred_only })}
          aria-pressed={filters.starred_only}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
            'border transition-all duration-200 cursor-pointer select-none',
            filters.starred_only
              ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20 hover:bg-yellow-400/15'
              : 'text-white/40 bg-white/5 border-white/10 hover:text-white/70 hover:bg-white/10',
          ].join(' ')}
        >
          <Star
            size={14}
            className={filters.starred_only ? 'fill-yellow-400' : ''}
            aria-hidden="true"
          />
          Starred only
        </button>

        {/* Batch summarize */}
        <GlassButton
          variant="ghost"
          size="sm"
          icon={<Sparkles size={14} />}
          onClick={onBatchSummarize}
          loading={isBatchSummarizing}
          aria-label="Batch summarize visible unsummarized articles"
        >
          {isBatchSummarizing ? 'Summarizing…' : 'Batch Summarize'}
        </GlassButton>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all duration-200 cursor-pointer"
            aria-label="Clear all filters"
          >
            <X size={14} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
