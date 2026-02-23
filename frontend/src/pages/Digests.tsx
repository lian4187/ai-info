import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAppStore } from '../store/appStore'
import { GlassButton, GlassSelect, EmptyState, LoadingSkeleton } from '../components/common'
import { DigestView, DigestGenerateModal } from '../components/summaries'
import { getDigests, generateDigest } from '../api/summaries'
import type { GenerateDigestParams } from '../api/summaries'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: '', label: 'All periods' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Digests() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const queryClient = useQueryClient()

  useEffect(() => {
    setCurrentPage('Digests')
  }, [setCurrentPage])

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [periodFilter, setPeriodFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const { data: digests = [], isLoading, isError } = useQuery({
    queryKey: ['digests', periodFilter],
    queryFn: () => getDigests(periodFilter || undefined),
    // Digests are complete when returned by the API — no polling needed
    refetchInterval: false,
  })

  // ---------------------------------------------------------------------------
  // Generate digest mutation
  // ---------------------------------------------------------------------------

  const generateMutation = useMutation({
    mutationFn: (params: GenerateDigestParams) => generateDigest(params),
    onSuccess: (newDigest) => {
      toast.success('Digest generation started')
      // Optimistically prepend the new digest so it shows immediately
      queryClient.setQueryData(
        ['digests', periodFilter],
        (old: typeof digests) => [newDigest, ...(old ?? [])]
      )
      // Invalidate to refetch true state
      queryClient.invalidateQueries({ queryKey: ['digests'] })
    },
  })

  const handleGenerate = async (params: GenerateDigestParams) => {
    return generateMutation.mutateAsync(params)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-white/90">Digests</h2>
          <p className="text-sm text-white/50 mt-0.5">
            AI-generated news digests
          </p>
        </div>

        <GlassButton
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setIsModalOpen(true)}
          aria-label="Generate new digest"
        >
          Generate Digest
        </GlassButton>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-3">
        <div className="w-44 shrink-0">
          <GlassSelect
            options={PERIOD_OPTIONS}
            value={periodFilter}
            onChange={(val) => setPeriodFilter(val)}
          />
        </div>

        {digests.length > 0 && (
          <p className="text-xs text-white/35" aria-live="polite">
            {digests.length} digest{digests.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : isError ? (
        <div
          className="flex items-center justify-center py-16 text-sm text-red-400"
          role="alert"
        >
          Failed to load digests. Please try again.
        </div>
      ) : digests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            periodFilter
              ? `No ${periodFilter} digests yet`
              : 'No digests yet'
          }
          description="Generate your first digest to get an AI-curated summary of the latest AI news."
          action={
            <GlassButton
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsModalOpen(true)}
            >
              Generate Your First Digest
            </GlassButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {digests.map((digest) => (
            <DigestView key={digest.id} digest={digest} />
          ))}
        </div>
      )}

      {/* Generate modal */}
      <DigestGenerateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerate}
      />
    </div>
  )
}
