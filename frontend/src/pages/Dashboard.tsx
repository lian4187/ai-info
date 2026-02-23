import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Rss,
  Newspaper,
  FileText,
  TrendingUp,
  Clock,
  ExternalLink,
  Star,
  RefreshCw,
} from 'lucide-react'
import { GlassCard, GlassButton, LoadingSkeleton } from '../components/common'
import { useAppStore } from '../store/appStore'
import { getDashboardStats, getRecentArticles, getRecentDigests } from '../api/dashboard'
import type { Article, DigestReport } from '../types'

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | number
  description: string
  color?: string
}

function StatCard({ icon: Icon, label, value, description, color = 'blue' }: StatCardProps) {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  }
  const c = colorMap[color] ?? colorMap.blue

  return (
    <GlassCard className="flex items-start gap-4">
      <div className={`p-3 rounded-xl ${c.bg} border ${c.border} shrink-0`}>
        <Icon size={20} className={c.text} />
      </div>
      <div>
        <p className="text-sm text-white/50 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/40 mt-1">{description}</p>
      </div>
    </GlassCard>
  )
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function RecentArticleRow({ article }: { article: Article }) {
  const navigate = useNavigate()
  return (
    <div
      className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
      onClick={() => navigate(`/articles?article_id=${article.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${article.is_read ? 'text-white/50' : 'text-white/90 font-medium'}`}>
          {article.title}
        </p>
        <p className="text-xs text-white/30 mt-0.5">
          {formatTimeAgo(article.published_at)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {article.is_starred && <Star size={14} className="text-amber-400 fill-amber-400" />}
        <ExternalLink size={14} className="text-white/20" />
      </div>
    </div>
  )
}

function RecentDigestRow({ digest }: { digest: DigestReport }) {
  const navigate = useNavigate()
  const periodColors: Record<string, string> = {
    daily: 'bg-blue-500/20 text-blue-300',
    weekly: 'bg-purple-500/20 text-purple-300',
    monthly: 'bg-amber-500/20 text-amber-300',
  }
  return (
    <div
      className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
      onClick={() => navigate(`/digests?digest_id=${digest.id}`)}
    >
      <span className={`text-xs px-2 py-0.5 rounded-full ${periodColors[digest.period_type] ?? 'bg-white/10 text-white/60'}`}>
        {digest.period_type}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">
          {new Date(digest.period_start).toLocaleDateString()} — {new Date(digest.period_end).toLocaleDateString()}
        </p>
        <p className="text-xs text-white/30 mt-0.5">{digest.article_count} articles</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const navigate = useNavigate()

  useEffect(() => {
    setCurrentPage('Dashboard')
  }, [setCurrentPage])

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 60000,
  })

  const { data: recentArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ['dashboard-recent-articles'],
    queryFn: () => getRecentArticles(8),
    refetchInterval: 60000,
  })

  const { data: recentDigests, isLoading: digestsLoading } = useQuery({
    queryKey: ['dashboard-recent-digests'],
    queryFn: () => getRecentDigests(5),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Overview of your AI news aggregation</p>
        </div>
        <GlassButton
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={() => refetchStats()}
        >
          Refresh
        </GlassButton>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <LoadingSkeleton variant="card" count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={Rss}
            label="Active Feeds"
            value={stats?.active_feeds ?? 0}
            description="Subscribed RSS sources"
            color="blue"
          />
          <StatCard
            icon={Newspaper}
            label="Total Articles"
            value={stats?.total_articles ?? 0}
            description="Collected articles"
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Summaries"
            value={stats?.total_summaries ?? 0}
            description="AI-generated summaries"
            color="purple"
          />
          <StatCard
            icon={FileText}
            label="Digests"
            value={stats?.total_digests ?? 0}
            description="Periodic reports"
            color="amber"
          />
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Articles */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-white/40" />
              <h2 className="text-base font-semibold text-white/80">Recent Articles</h2>
            </div>
            <GlassButton variant="ghost" size="sm" onClick={() => navigate('/articles')}>
              View all
            </GlassButton>
          </div>
          {articlesLoading ? (
            <LoadingSkeleton variant="list" count={5} />
          ) : recentArticles && recentArticles.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recentArticles.map((article) => (
                <RecentArticleRow key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 text-center py-8">
              No articles yet. Add some RSS feeds to get started.
            </p>
          )}
        </GlassCard>

        {/* Recent Digests */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-white/40" />
              <h2 className="text-base font-semibold text-white/80">Recent Digests</h2>
            </div>
            <GlassButton variant="ghost" size="sm" onClick={() => navigate('/digests')}>
              View all
            </GlassButton>
          </div>
          {digestsLoading ? (
            <LoadingSkeleton variant="list" count={3} />
          ) : recentDigests && recentDigests.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recentDigests.map((digest) => (
                <RecentDigestRow key={digest.id} digest={digest} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 text-center py-8">
              No digests yet. Configure an LLM provider and generate your first digest.
            </p>
          )}
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard>
        <h2 className="text-base font-semibold text-white/80 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <GlassButton variant="primary" size="sm" onClick={() => navigate('/feeds')}>
            Add Feed
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => navigate('/feeds')}>
            Import OPML
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => navigate('/digests')}>
            Generate Digest
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => navigate('/settings')}>
            Configure LLM
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  )
}
