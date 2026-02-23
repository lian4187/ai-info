import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Calendar,
  Newspaper,
  Cpu,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'
import { GlassCard } from '../common'
import type { DigestReport } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Period badge
// ---------------------------------------------------------------------------

const periodBadgeClasses: Record<string, string> = {
  daily: 'bg-blue-500/15 border-blue-500/25 text-blue-400',
  weekly: 'bg-purple-500/15 border-purple-500/25 text-purple-400',
  monthly: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DigestViewProps {
  digest: DigestReport
  defaultExpanded?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DigestView({ digest, defaultExpanded = false }: DigestViewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const periodBadge =
    periodBadgeClasses[digest.period_type] ?? periodBadgeClasses.daily

  // Describe the period range as a human-readable title
  const periodLabel =
    digest.period_type.charAt(0).toUpperCase() + digest.period_type.slice(1)

  return (
    <GlassCard className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Period type badge */}
        <span
          className={[
            'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
            'border shrink-0',
            periodBadge,
          ].join(' ')}
        >
          {periodLabel}
        </span>

        <div className="flex-1 min-w-0">
          {/* Date range */}
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} aria-hidden="true" />
              {formatDate(digest.period_start)} — {formatDate(digest.period_end)}
            </span>

            <span className="flex items-center gap-1.5">
              <Newspaper size={11} aria-hidden="true" />
              {digest.article_count} articles
            </span>
          </div>
        </div>

        {/* Created timestamp */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="flex items-center gap-1 text-xs text-white/25">
            <Clock size={10} aria-hidden="true" />
            <time dateTime={digest.created_at}>{formatDate(digest.created_at)}</time>
          </span>
        </div>
      </div>

      {/* Model info */}
      {digest.llm_model && (
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Cpu size={11} aria-hidden="true" />
          <span className="font-mono">{digest.llm_model}</span>
        </div>
      )}

      {/* Expand/collapse content */}
      {digest.content && (
        <>
          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer select-none w-fit"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={13} aria-hidden="true" />
                Collapse digest
              </>
            ) : (
              <>
                <ChevronDown size={13} aria-hidden="true" />
                Read full digest
              </>
            )}
          </button>

          {/* Markdown content */}
          {isExpanded && (
            <div
              className={[
                'pt-4 border-t border-white/10',
                'prose prose-sm prose-invert max-w-none',
                'prose-p:text-white/60 prose-p:leading-relaxed',
                'prose-headings:text-white/80 prose-headings:font-semibold',
                'prose-h1:text-base prose-h2:text-sm prose-h3:text-sm',
                'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
                'prose-strong:text-white/80',
                'prose-li:text-white/60',
                'prose-ul:my-2 prose-li:my-0.5',
                'prose-blockquote:border-l-blue-500/50 prose-blockquote:text-white/50',
                'prose-hr:border-white/10',
              ].join(' ')}
            >
              <ReactMarkdown>{digest.content}</ReactMarkdown>
            </div>
          )}
        </>
      )}
    </GlassCard>
  )
}
