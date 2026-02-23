import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  RefreshCw,
  Pencil,
  Trash2,
  ExternalLink,
  Newspaper,
  Clock,
} from 'lucide-react'
import { GlassCard, GlassButton } from '../common'
import { deleteFeed, fetchFeed } from '../../api/feeds'
import type { RSSFeed } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-400' },
  paused: { label: 'Paused', color: 'bg-amber-400' },
} satisfies Record<string, { label: string; color: string }>

function getStatusConfig(isActive: boolean) {
  return isActive ? statusConfig.active : statusConfig.paused
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FeedCardProps {
  feed: RSSFeed
  categoryName?: string
  onEdit: (feed: RSSFeed) => void
}

export function FeedCard({ feed, categoryName, onEdit }: FeedCardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: () => deleteFeed(feed.id),
    onSuccess: () => {
      toast.success(`"${feed.title}" removed`)
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })

  const { mutate: doFetch, isPending: fetching } = useMutation({
    mutationFn: () => fetchFeed(feed.id),
    onSuccess: (data) => {
      toast.success(`Fetched ${data.articles_fetched} new articles`)
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Remove feed "${feed.title}"?`)) return
    doDelete()
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(feed)
  }

  const handleFetch = (e: React.MouseEvent) => {
    e.stopPropagation()
    doFetch()
  }

  const status = getStatusConfig(feed.is_active)

  // Truncate long URLs for display
  const displayUrl = feed.url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <GlassCard
      hover
      onClick={() => navigate(`/articles?feed_id=${feed.id}`)}
      className="flex flex-col gap-4 p-5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className="mt-1 shrink-0">
          <span
            className={`block w-2.5 h-2.5 rounded-full ${status.color} shadow-sm`}
            title={status.label}
            aria-label={`Status: ${status.label}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white/90 truncate leading-snug">
            {feed.title}
          </h3>
          <p className="text-xs text-white/40 truncate mt-0.5">{displayUrl}</p>
        </div>

        {/* External link */}
        <a
          href={feed.site_url || feed.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all duration-200"
          aria-label="Open site in new tab"
        >
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-white/40">
        {categoryName && (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300/80 font-medium">
            {categoryName}
          </span>
        )}

        <span className="flex items-center gap-1">
          <Newspaper size={12} aria-hidden="true" />
          {feed.article_count.toLocaleString()} articles
        </span>

        <span className="flex items-center gap-1 ml-auto">
          <Clock size={12} aria-hidden="true" />
          {relativeTime(feed.last_fetched_at ?? undefined)}
        </span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 pt-1 border-t border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassButton
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={13} />}
          loading={fetching}
          onClick={handleFetch}
          aria-label={`Fetch ${feed.title} now`}
        >
          Fetch Now
        </GlassButton>

        <div className="flex items-center gap-1 ml-auto">
          <GlassButton
            variant="secondary"
            size="sm"
            icon={<Pencil size={13} />}
            onClick={handleEdit}
            aria-label={`Edit ${feed.title}`}
          >
            Edit
          </GlassButton>

          <GlassButton
            variant="danger"
            size="sm"
            icon={<Trash2 size={13} />}
            loading={deleting}
            onClick={handleDelete}
            aria-label={`Delete ${feed.title}`}
          />
        </div>
      </div>
    </GlassCard>
  )
}
