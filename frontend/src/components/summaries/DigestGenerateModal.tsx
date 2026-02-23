import React, { useState } from 'react'
import { FileText, CalendarRange } from 'lucide-react'
import { GlassModal, GlassButton, GlassSelect, GlassInput } from '../common'
import type { DigestReport } from '../../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today's date in YYYY-MM-DD format */
function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** Returns a date N days ago in YYYY-MM-DD format */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  period_type: string
  start_date: string
  end_date: string
}

const DEFAULT_FORM: FormState = {
  period_type: 'daily',
  start_date: daysAgo(1),
  end_date: today(),
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DigestGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (params: {
    period_type: string
    start_date?: string
    end_date?: string
  }) => Promise<DigestReport>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DigestGenerateModal({
  isOpen,
  onClose,
  onGenerate,
}: DigestGenerateModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<DigestReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }))

  const handlePeriodChange = (val: string) => {
    update({
      period_type: val,
      start_date: val === 'weekly' ? daysAgo(7) : val === 'monthly' ? daysAgo(30) : daysAgo(1),
      end_date: today(),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const digest = await onGenerate({
        period_type: form.period_type,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      })
      setResult(digest)
    } catch {
      setError('Failed to generate digest. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setForm(DEFAULT_FORM)
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Digest"
      size="md"
    >
      {/* Success state */}
      {result ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <FileText size={24} className="text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-semibold text-white/90">Digest generated!</p>
              <p className="text-sm text-white/50 mt-1 max-w-xs">
                Your <span className="text-white/70 capitalize">{result.period_type}</span> digest
                has been created and will appear in the list.
              </p>
            </div>
          </div>

          {/* Result preview card */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <CalendarRange size={11} aria-hidden="true" />
                {new Date(result.period_start).toLocaleDateString()} —{' '}
                {new Date(result.period_end).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span>{result.article_count} articles</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <GlassButton variant="secondary" onClick={() => { setResult(null); setForm(DEFAULT_FORM) }}>
              Generate Another
            </GlassButton>
            <GlassButton variant="primary" onClick={handleClose}>
              Done
            </GlassButton>
          </div>
        </div>
      ) : (
        /* Form state */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Period type */}
          <GlassSelect
            label="Period Type"
            options={PERIOD_OPTIONS}
            value={form.period_type}
            onChange={handlePeriodChange}
          />

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => update({ start_date: e.target.value })}
              max={form.end_date || today()}
            />
            <GlassInput
              label="End Date"
              type="date"
              value={form.end_date}
              onChange={(e) => update({ end_date: e.target.value })}
              min={form.start_date}
              max={today()}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 px-1">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <GlassButton
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              type="submit"
              loading={isLoading}
              icon={<FileText size={14} />}
            >
              {isLoading ? 'Generating…' : 'Generate Digest'}
            </GlassButton>
          </div>
        </form>
      )}
    </GlassModal>
  )
}
