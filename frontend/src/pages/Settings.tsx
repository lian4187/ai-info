import { useEffect, useState } from 'react'
import { Plus, Cpu, CalendarClock, Trash2, AlertTriangle } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/appStore'
import { GlassCard, GlassButton, GlassModal, EmptyState, LoadingSkeleton } from '../components/common'
import {
  LLMProviderCard,
  AddProviderModal,
  EditProviderModal,
  SchedulerConfig,
} from '../components/settings'
import {
  getLLMProviders,
  deleteLLMProvider,
  setDefaultLLMProvider,
  testLLMProvider,
} from '../api/settings'
import type { LLMProviderConfig } from '../types'

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

interface DeleteProviderModalProps {
  provider: LLMProviderConfig | null
  onClose: () => void
}

function DeleteProviderModal({ provider, onClose }: DeleteProviderModalProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteLLMProvider(provider!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-providers'] })
      toast.success(`Provider "${provider?.display_name}" deleted`)
      onClose()
    },
  })

  return (
    <GlassModal
      isOpen={!!provider}
      onClose={onClose}
      title="Delete Provider"
      size="sm"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/25 shrink-0">
            <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-white/75">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white/90">{provider?.display_name}</span>?
            </p>
            <p className="text-xs text-white/40 mt-1">
              This action cannot be undone. Any summaries using this provider will continue
              to exist but won't be regenerated.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <GlassButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="danger"
            size="sm"
            loading={isPending}
            icon={<Trash2 size={14} aria-hidden="true" />}
            onClick={() => mutate()}
          >
            Delete
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  )
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

interface SectionHeadingProps {
  icon: React.ComponentType<LucideProps>
  title: string
  description: string
  action?: React.ReactNode
}

function SectionHeading({ icon: Icon, title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
          <Icon size={18} className="text-white/50" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white/90">{title}</h2>
          <p className="text-xs text-white/45 mt-0.5">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Settings() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LLMProviderConfig | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LLMProviderConfig | null>(null)

  useEffect(() => {
    setCurrentPage('Settings')
  }, [setCurrentPage])

  // -------------------------------------------------------------------------
  // LLM provider data
  // -------------------------------------------------------------------------

  const {
    data: providers,
    isLoading: loadingProviders,
    error: providersError,
  } = useQuery({
    queryKey: ['llm-providers'],
    queryFn: getLLMProviders,
  })

  const queryClient = useQueryClient()

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultLLMProvider(id)
      queryClient.invalidateQueries({ queryKey: ['llm-providers'] })
      toast.success('Default provider updated')
    } catch {
      // axios interceptor shows the toast
    }
  }

  const handleTest = (id: number) => testLLMProvider(id)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white/90">Settings</h1>
        <p className="text-sm text-white/45 mt-0.5">
          Configure AI providers and automated task schedules
        </p>
      </div>

      {/* ================================================================ */}
      {/* LLM Providers section                                            */}
      {/* ================================================================ */}
      <section aria-labelledby="llm-section-heading">
        <GlassCard className="space-y-6">
          <SectionHeading
            icon={Cpu}
            title="LLM Providers"
            description="Connect AI providers to generate article summaries and digest reports"
            action={
              <GlassButton
                variant="primary"
                size="sm"
                icon={<Plus size={15} aria-hidden="true" />}
                onClick={() => setAddOpen(true)}
              >
                Add Provider
              </GlassButton>
            }
          />

          {/* Provider cards */}
          {loadingProviders && (
            <LoadingSkeleton variant="card" count={2} />
          )}

          {!loadingProviders && providersError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <AlertTriangle size={15} aria-hidden="true" />
              Failed to load providers — check your connection and try again
            </div>
          )}

          {!loadingProviders && !providersError && providers && providers.length === 0 && (
            <EmptyState
              icon={Cpu}
              title="No providers configured"
              description="Add an LLM provider to enable AI-powered summaries and digest generation."
              action={
                <GlassButton
                  variant="primary"
                  size="sm"
                  icon={<Plus size={15} aria-hidden="true" />}
                  onClick={() => setAddOpen(true)}
                >
                  Add Your First Provider
                </GlassButton>
              }
            />
          )}

          {!loadingProviders && providers && providers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((p) => (
                <LLMProviderCard
                  key={p.id}
                  provider={p}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                  onSetDefault={handleSetDefault}
                  onTest={handleTest}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </section>

      {/* ================================================================ */}
      {/* Scheduled Tasks section                                          */}
      {/* ================================================================ */}
      <section aria-labelledby="scheduler-section-heading">
        <GlassCard className="space-y-6">
          <SectionHeading
            icon={CalendarClock}
            title="Scheduled Tasks"
            description="Automate feed fetching, summary generation, and digest creation"
          />

          <SchedulerConfig />
        </GlassCard>
      </section>

      {/* ================================================================ */}
      {/* Modals                                                            */}
      {/* ================================================================ */}
      <AddProviderModal isOpen={addOpen} onClose={() => setAddOpen(false)} />

      {editTarget && (
        <EditProviderModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          provider={editTarget}
        />
      )}

      <DeleteProviderModal
        provider={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
