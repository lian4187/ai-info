import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GlassModal, GlassInput, GlassSelect, GlassButton } from '../common'
import { updateFeed } from '../../api/feeds'
import type { RSSFeed, FeedCategory } from '../../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERVAL_OPTIONS = [
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every 1 hour' },
  { value: '120', label: 'Every 2 hours' },
  { value: '240', label: 'Every 4 hours' },
  { value: '360', label: 'Every 6 hours' },
  { value: '720', label: 'Every 12 hours' },
  { value: '1440', label: 'Every 24 hours' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EditFeedModalProps {
  feed: RSSFeed | null
  isOpen: boolean
  onClose: () => void
  categories: FeedCategory[]
}

interface FormState {
  title: string
  url: string
  category_id: string
  fetch_interval_minutes: string
  is_active: boolean
}

function feedToForm(feed: RSSFeed): FormState {
  return {
    title: feed.title,
    url: feed.url,
    category_id: feed.category_id != null ? String(feed.category_id) : '',
    fetch_interval_minutes: String(feed.fetch_interval_minutes),
    is_active: feed.is_active,
  }
}

export function EditFeedModal({
  feed,
  isOpen,
  onClose,
  categories,
}: EditFeedModalProps) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(() =>
    feed ? feedToForm(feed) : feedToForm({} as RSSFeed)
  )

  // Sync when the target feed changes
  useEffect(() => {
    if (feed) setForm(feedToForm(feed))
  }, [feed])

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ]

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!feed) throw new Error('No feed selected')
      return updateFeed(feed.id, {
        title: form.title.trim(),
        url: form.url.trim(),
        category_id: form.category_id ? Number(form.category_id) : undefined,
        fetch_interval_minutes: Number(form.fetch_interval_minutes),
        is_active: form.is_active,
      })
    },
    onSuccess: (updated) => {
      toast.success(`"${updated.title}" updated`)
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      onClose()
    },
  })

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate()
  }

  if (!feed) return null

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Edit Feed" size="md">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <GlassInput
          label="Title"
          type="text"
          value={form.title}
          onChange={(e) => set('title')(e.target.value)}
          required
          autoFocus
        />

        <GlassInput
          label="Feed URL"
          type="url"
          value={form.url}
          onChange={(e) => set('url')(e.target.value)}
          required
        />

        <GlassSelect
          label="Category"
          value={form.category_id}
          onChange={set('category_id')}
          options={categoryOptions}
          placeholder="No category"
        />

        <GlassSelect
          label="Fetch Interval"
          value={form.fetch_interval_minutes}
          onChange={set('fetch_interval_minutes')}
          options={INTERVAL_OPTIONS}
        />

        {/* Active toggle */}
        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <span className="text-sm font-medium text-white/70">Active</span>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
            className={[
              'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent',
              'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent',
              form.is_active ? 'bg-emerald-500' : 'bg-white/20',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className={[
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg',
                'transform transition duration-200 ease-in-out',
                form.is_active ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <GlassButton
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </GlassButton>
          <GlassButton type="submit" variant="primary" loading={isPending}>
            Save Changes
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  )
}
