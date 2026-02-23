import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GlassModal, GlassInput, GlassSelect, GlassButton } from '../common'
import { createFeed } from '../../api/feeds'
import type { FeedCategory } from '../../types'

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
// Validation
// ---------------------------------------------------------------------------

function isValidURL(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AddFeedModalProps {
  isOpen: boolean
  onClose: () => void
  categories: FeedCategory[]
}

interface FormState {
  url: string
  title: string
  category_id: string
  fetch_interval_minutes: string
}

const defaultForm: FormState = {
  url: '',
  title: '',
  category_id: '',
  fetch_interval_minutes: '60',
}

export function AddFeedModal({
  isOpen,
  onClose,
  categories,
}: AddFeedModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(defaultForm)
  const [urlError, setUrlError] = useState('')

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ]

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      createFeed({
        url: form.url.trim(),
        title: form.title.trim() || undefined,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        fetch_interval_minutes: Number(form.fetch_interval_minutes),
      }),
    onSuccess: (feed) => {
      toast.success(`Feed "${feed.title}" added`)
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      setForm(defaultForm)
      onClose()
    },
  })

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidURL(form.url.trim())) {
      setUrlError('Please enter a valid http:// or https:// URL')
      return
    }
    setUrlError('')
    mutate()
  }

  const handleClose = () => {
    setForm(defaultForm)
    setUrlError('')
    onClose()
  }

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Add RSS Feed" size="md">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <GlassInput
          label="Feed URL"
          type="url"
          placeholder="https://example.com/feed.xml"
          value={form.url}
          onChange={(e) => {
            set('url')(e.target.value)
            if (urlError) setUrlError('')
          }}
          error={urlError}
          required
          autoFocus
        />

        <GlassInput
          label="Title (optional)"
          type="text"
          placeholder="Auto-detected from feed"
          value={form.title}
          onChange={(e) => set('title')(e.target.value)}
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <GlassButton
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </GlassButton>
          <GlassButton type="submit" variant="primary" loading={isPending}>
            Add Feed
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  )
}
