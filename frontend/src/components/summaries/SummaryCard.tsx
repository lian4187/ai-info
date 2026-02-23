import {
  Sparkles,
  CheckCircle2,
  Clock,
  Cpu,
} from 'lucide-react'
import { GlassCard } from '../common'
import type { Summary, Article } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  summary: Summary
  article?: Article
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SummaryCard({ summary, article }: SummaryCardProps) {
  return (
    <GlassCard className="flex flex-col gap-4">
      {/* Header: article title + AI badge */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
          <Sparkles size={16} className="text-blue-400" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          {article && (
            <p className="text-xs text-white/40 mb-1 truncate">
              Feed #{article.feed_id}
            </p>
          )}
          <h3 className="text-sm font-semibold text-white/85 leading-snug line-clamp-2">
            {article?.title ?? `Article #${summary.article_id}`}
          </h3>
        </div>
      </div>

      {/* Summary text */}
      <p className="text-sm text-white/65 leading-relaxed">{summary.summary_text}</p>

      {/* Key points */}
      {summary.key_points && summary.key_points.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">
            Key Points
          </p>
          <ul className="space-y-2">
            {summary.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2
                  size={14}
                  className="text-blue-400/60 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-white/60 leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer: model info + date */}
      <div className="flex items-center gap-3 pt-3 border-t border-white/5 text-xs text-white/30">
        {summary.llm_model && (
          <span className="flex items-center gap-1.5">
            <Cpu size={11} aria-hidden="true" />
            <span className="font-mono">{summary.llm_model}</span>
          </span>
        )}

        <span className="flex items-center gap-1 ml-auto">
          <Clock size={11} aria-hidden="true" />
          <time dateTime={summary.created_at}>{formatDate(summary.created_at)}</time>
        </span>
      </div>
    </GlassCard>
  )
}
