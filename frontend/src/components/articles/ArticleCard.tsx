import React from 'react'
import {
  Star,
  Clock,
  Rss,
  Sparkles,
  Loader2,
  User,
  Circle,
} from 'lucide-react'
import { GlassCard, GlassButton } from '../common'
import type { Article, Summary } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ArticleCardProps {
  article: Article
  summary?: Summary
  onSelect: (article: Article) => void
  onToggleRead: (id: number) => void
  onToggleStar: (id: number) => void
  onSummarize: (id: number) => void
  summarizingId?: number | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleCard({
  article,
  summary,
  onSelect,
  onToggleRead,
  onToggleStar,
  onSummarize,
  summarizingId,
}: ArticleCardProps) {
  const isRead = article.is_read
  const isStarred = article.is_starred
  const hasSummary = !!summary
  const isSummarizing = summarizingId === article.id

  // Truncate summary preview to 120 chars
  const summaryPreview = summary?.summary_text
    ? summary.summary_text.slice(0, 120) +
      (summary.summary_text.length > 120 ? '…' : '')
    : null

  // Excerpt from content (strip HTML tags, truncate to 140 chars)
  const contentExcerpt = article.content
    ? article.content.replace(/<[^>]+>/g, '').slice(0, 140).trimEnd() +
      (article.content.replace(/<[^>]+>/g, '').length > 140 ? '…' : '')
    : null

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleRead(article.id)
  }

  const handleToggleStar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleStar(article.id)
  }

  const handleSummarize = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSummarize(article.id)
  }

  return (
    <GlassCard
      hover
      onClick={() => onSelect(article)}
      className={[
        'group relative flex flex-col gap-3 p-5 transition-opacity duration-200',
        isRead ? 'opacity-60 hover:opacity-100' : '',
      ].join(' ')}
    >
      {/* Unread indicator dot */}
      {!isRead && (
        <span className="absolute top-4 right-4">
          <Circle
            size={8}
            className="fill-blue-400 text-blue-400"
            aria-label="Unread"
          />
        </span>
      )}

      {/* Header: feed_id + author + date */}
      <div className="flex items-center gap-2 text-xs text-white/40 pr-6">
        <Rss size={11} className="shrink-0" aria-hidden="true" />
        <span className="truncate font-medium text-white/50">
          Feed #{article.feed_id}
        </span>

        {article.author && (
          <>
            <span className="opacity-40" aria-hidden="true">·</span>
            <User size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[120px]">{article.author}</span>
          </>
        )}

        {article.published_at && (
          <>
            <span className="opacity-40" aria-hidden="true">·</span>
            <Clock size={11} className="shrink-0" aria-hidden="true" />
            <time
              dateTime={article.published_at}
              title={new Date(article.published_at).toLocaleString()}
            >
              {formatRelativeDate(article.published_at)}
            </time>
          </>
        )}
      </div>

      {/* Title */}
      <h3
        className={[
          'text-sm font-semibold leading-snug line-clamp-2 pr-2',
          isRead ? 'text-white/60' : 'text-white/90',
        ].join(' ')}
      >
        {article.title}
      </h3>

      {/* Summary preview or content excerpt */}
      {summaryPreview ? (
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 italic">
          <span className="text-blue-400/70 font-medium not-italic">AI: </span>
          {summaryPreview}
        </p>
      ) : contentExcerpt ? (
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
          {contentExcerpt}
        </p>
      ) : null}

      {/* Key points preview (first point only) */}
      {hasSummary && summary.key_points && summary.key_points.length > 0 && (
        <ul className="space-y-1">
          <li className="flex items-start gap-1.5 text-xs text-white/35">
            <span className="mt-0.5 shrink-0 w-1 h-1 rounded-full bg-blue-400/50" aria-hidden="true" />
            <span className="line-clamp-1">{summary.key_points[0]}</span>
          </li>
        </ul>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        {/* Star toggle */}
        <button
          onClick={handleToggleStar}
          aria-label={isStarred ? 'Unstar article' : 'Star article'}
          className={[
            'p-1.5 rounded-lg transition-all duration-200 cursor-pointer',
            isStarred
              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10'
              : 'text-white/30 hover:text-yellow-400 hover:bg-yellow-400/10',
          ].join(' ')}
        >
          <Star
            size={14}
            className={isStarred ? 'fill-yellow-400' : ''}
            aria-hidden="true"
          />
        </button>

        {/* Read toggle */}
        <button
          onClick={handleToggleRead}
          aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
          className="px-2 py-1 rounded-lg text-xs text-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-200 cursor-pointer"
        >
          {isRead ? 'Mark unread' : 'Mark read'}
        </button>

        <div className="flex-1" />

        {/* Summarize button */}
        {!hasSummary && (
          <GlassButton
            variant="ghost"
            size="sm"
            icon={
              isSummarizing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )
            }
            onClick={handleSummarize}
            disabled={isSummarizing}
            aria-label="Generate AI summary"
          >
            {isSummarizing ? 'Summarizing…' : 'Summarize'}
          </GlassButton>
        )}
      </div>
    </GlassCard>
  )
}
