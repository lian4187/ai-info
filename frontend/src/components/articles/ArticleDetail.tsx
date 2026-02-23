import { useState } from 'react'
import {
  ExternalLink,
  Star,
  Clock,
  User,
  Rss,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { GlassModal, GlassButton } from '../common'
import type { Article, Summary } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFullDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SummarySectionProps {
  summary: Summary
}

function SummarySection({ summary }: SummarySectionProps) {
  return (
    <div className="mt-6 rounded-xl bg-blue-500/5 border border-blue-500/20 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-blue-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-blue-400">AI Summary</h3>
        {summary.llm_model && (
          <span className="ml-auto text-xs text-white/30 font-mono">
            {summary.llm_model}
          </span>
        )}
      </div>

      <p className="text-sm text-white/70 leading-relaxed">{summary.summary_text}</p>

      {summary.key_points && summary.key_points.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            Key Points
          </p>
          <ul className="space-y-2">
            {summary.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                <CheckCircle2
                  size={14}
                  className="text-blue-400/60 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ArticleDetailProps {
  article: Article | null
  summary?: Summary | null
  isOpen: boolean
  onClose: () => void
  onToggleRead: (id: number) => void
  onToggleStar: (id: number) => void
  onSummarize: (id: number) => Promise<void>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleDetail({
  article,
  summary,
  isOpen,
  onClose,
  onToggleRead,
  onToggleStar,
  onSummarize,
}: ArticleDetailProps) {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  if (!article) return null

  const isRead = article.is_read
  const isStarred = article.is_starred
  const hasSummary = !!summary

  const handleSummarize = async () => {
    setIsSummarizing(true)
    setSummaryError(null)
    try {
      await onSummarize(article.id)
    } catch {
      setSummaryError('Failed to generate summary. Please try again.')
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Article"
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <Rss size={11} aria-hidden="true" />
            <span className="text-white/50 font-medium">
              Feed #{article.feed_id}
            </span>
          </span>

          {article.author && (
            <span className="flex items-center gap-1.5">
              <User size={11} aria-hidden="true" />
              {article.author}
            </span>
          )}

          {article.published_at && (
            <span className="flex items-center gap-1.5">
              <Clock size={11} aria-hidden="true" />
              <time dateTime={article.published_at}>
                {formatFullDate(article.published_at)}
              </time>
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-white/90 leading-snug">
          {article.title}
        </h2>

        {/* Action bar */}
        <div className="flex items-center gap-2 pb-4 border-b border-white/10">
          {/* External link */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
            aria-label="Open original article in new tab"
          >
            <ExternalLink size={12} aria-hidden="true" />
            Read Original
          </a>

          {/* Star toggle */}
          <button
            onClick={() => onToggleStar(article.id)}
            aria-label={isStarred ? 'Unstar article' : 'Star article'}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs',
              'border transition-all duration-200 cursor-pointer',
              isStarred
                ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20 hover:bg-yellow-400/15'
                : 'text-white/40 bg-white/5 border-white/10 hover:text-yellow-400 hover:bg-yellow-400/10',
            ].join(' ')}
          >
            <Star
              size={12}
              className={isStarred ? 'fill-yellow-400' : ''}
              aria-hidden="true"
            />
            {isStarred ? 'Starred' : 'Star'}
          </button>

          {/* Read toggle */}
          <button
            onClick={() => onToggleRead(article.id)}
            aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/70 transition-all duration-200 cursor-pointer"
          >
            {isRead ? 'Mark unread' : 'Mark read'}
          </button>
        </div>

        {/* Article content */}
        {article.content ? (
          /**
           * Content is rendered as HTML from the RSS feed.
           * In production, pass through a sanitizer library (e.g. DOMPurify)
           * before setting innerHTML. Here we trust the server-side sanitization.
           */
          <div
            className={[
              'prose prose-sm prose-invert max-w-none',
              'prose-p:text-white/60 prose-p:leading-relaxed',
              'prose-headings:text-white/80 prose-headings:font-semibold',
              'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
              'prose-strong:text-white/80',
              'prose-li:text-white/60',
              'prose-img:rounded-xl prose-img:border prose-img:border-white/10',
              'prose-blockquote:border-l-blue-500/50 prose-blockquote:text-white/50',
              'prose-code:text-blue-300 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded',
              'prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10',
            ].join(' ')}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <p className="text-sm text-white/30 italic">No content available.</p>
        )}

        {/* Summary section */}
        {hasSummary ? (
          <SummarySection summary={summary} />
        ) : (
          <div className="mt-6 rounded-xl bg-white/3 border border-white/10 p-5 flex flex-col items-center gap-3 text-center">
            <Sparkles size={24} className="text-white/20" aria-hidden="true" />
            <p className="text-sm text-white/40">
              No AI summary generated yet.
            </p>

            {summaryError && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle size={12} aria-hidden="true" />
                {summaryError}
              </p>
            )}

            <GlassButton
              variant="secondary"
              size="sm"
              icon={
                isSummarizing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )
              }
              onClick={handleSummarize}
              loading={isSummarizing}
            >
              {isSummarizing ? 'Generating Summary…' : 'Generate Summary'}
            </GlassButton>
          </div>
        )}
      </div>
    </GlassModal>
  )
}
