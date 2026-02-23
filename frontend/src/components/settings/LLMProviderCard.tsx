import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  Pencil,
  Trash2,
  Zap,
  ExternalLink,
} from 'lucide-react'
import { GlassCard, GlassButton } from '../common'
import type { LLMProviderConfig, LLMProviderType } from '../../types'

// ---------------------------------------------------------------------------
// Provider visual metadata
// ---------------------------------------------------------------------------

interface ProviderMeta {
  label: string
  colorClass: string   // badge background
  dotClass: string     // accent dot
}

const PROVIDER_META: Record<LLMProviderType, ProviderMeta> = {
  openai: {
    label: 'OpenAI',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  anthropic: {
    label: 'Anthropic',
    colorClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    dotClass: 'bg-orange-400',
  },
  zhipu: {
    label: 'Zhipu',
    colorClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    dotClass: 'bg-orange-400',
  },
  doubao: {
    label: 'Doubao',
    colorClass: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    dotClass: 'bg-cyan-400',
  },
  minimax: {
    label: 'MiniMax',
    colorClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    dotClass: 'bg-purple-400',
  },
  gemini: {
    label: 'Gemini',
    colorClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    dotClass: 'bg-blue-400',
  },
  openai_compat: {
    label: 'Custom',
    colorClass: 'bg-white/10 text-white/60 border border-white/15',
    dotClass: 'bg-white/50',
  },
}

function maskApiKey(key?: string): string {
  if (!key || key.length < 4) return '••••••••'
  return `••••••••${key.slice(-4)}`
}

// ---------------------------------------------------------------------------
// Test result local state
// ---------------------------------------------------------------------------

type TestState = 'idle' | 'loading' | 'success' | 'error'

interface TestResult {
  state: TestState
  message?: string
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LLMProviderCardProps {
  provider: LLMProviderConfig
  onEdit: (provider: LLMProviderConfig) => void
  onDelete: (provider: LLMProviderConfig) => void
  onSetDefault: (id: number) => Promise<void>
  onTest: (id: number) => Promise<{ success: boolean; message?: string; latency_ms?: number }>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LLMProviderCard({
  provider,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
}: LLMProviderCardProps) {
  const [testResult, setTestResult] = useState<TestResult>({ state: 'idle' })
  const [settingDefault, setSettingDefault] = useState(false)

  const meta = PROVIDER_META[provider.provider_type] ?? PROVIDER_META.openai_compat

  const handleTest = async () => {
    setTestResult({ state: 'loading' })
    try {
      const result = await onTest(provider.id)
      if (result.success) {
        const latency = result.latency_ms != null ? ` (${result.latency_ms}ms)` : ''
        setTestResult({ state: 'success', message: `Connected${latency}` })
      } else {
        setTestResult({ state: 'error', message: result.message ?? 'Connection failed' })
      }
    } catch {
      setTestResult({ state: 'error', message: 'Request failed' })
    }
  }

  const handleSetDefault = async () => {
    setSettingDefault(true)
    try {
      await onSetDefault(provider.id)
    } finally {
      setSettingDefault(false)
    }
  }

  return (
    <GlassCard className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Provider color dot */}
        <div
          className={[
            'mt-0.5 w-2.5 h-2.5 rounded-full shrink-0',
            meta.dotClass,
          ].join(' ')}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-white/90 truncate">
              {provider.display_name}
            </h3>

            {/* Provider badge */}
            <span
              className={[
                'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
                meta.colorClass,
              ].join(' ')}
            >
              {meta.label}
            </span>

            {/* Default badge */}
            {provider.is_default && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                <Star size={10} aria-hidden="true" />
                Default
              </span>
            )}

            {/* Active/inactive — removed, LLM configs don't have is_active */}
          </div>

          {/* Model name */}
          <p className="text-sm text-white/50 mt-0.5 truncate">{provider.model_name}</p>
        </div>
      </div>

      {/* Detail rows */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-white/35 text-xs uppercase tracking-wide">API Key</span>
          <p className="text-white/60 font-mono text-xs mt-0.5">
            {maskApiKey(provider.api_key_masked)}
          </p>
        </div>

        <div>
          <span className="text-white/35 text-xs uppercase tracking-wide">Temperature</span>
          <p className="text-white/60 mt-0.5">{provider.temperature.toFixed(1)}</p>
        </div>

        {provider.base_url && (
          <div className="col-span-2">
            <span className="text-white/35 text-xs uppercase tracking-wide">Base URL</span>
            <p className="text-white/50 text-xs mt-0.5 truncate font-mono flex items-center gap-1">
              <ExternalLink size={11} aria-hidden="true" className="shrink-0" />
              {provider.base_url}
            </p>
          </div>
        )}

        <div>
          <span className="text-white/35 text-xs uppercase tracking-wide">Max Tokens</span>
          <p className="text-white/60 mt-0.5">{provider.max_tokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Test result banner */}
      {testResult.state !== 'idle' && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
            testResult.state === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-300'
              : testResult.state === 'error'
              ? 'bg-red-500/15 border border-red-500/25 text-red-300'
              : 'bg-white/5 border border-white/10 text-white/50',
          ].join(' ')}
        >
          {testResult.state === 'loading' && (
            <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />
          )}
          {testResult.state === 'success' && (
            <CheckCircle2 size={14} className="shrink-0" aria-hidden="true" />
          )}
          {testResult.state === 'error' && (
            <XCircle size={14} className="shrink-0" aria-hidden="true" />
          )}
          <span>
            {testResult.state === 'loading'
              ? 'Testing connection...'
              : testResult.message}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap border-t border-white/5 pt-3 mt-auto">
        {/* Test connection */}
        <GlassButton
          variant="secondary"
          size="sm"
          loading={testResult.state === 'loading'}
          icon={<Zap size={14} aria-hidden="true" />}
          onClick={handleTest}
          aria-label={`Test connection for ${provider.display_name}`}
        >
          Test
        </GlassButton>

        {/* Set default */}
        {!provider.is_default && (
          <GlassButton
            variant="ghost"
            size="sm"
            loading={settingDefault}
            icon={<Star size={14} aria-hidden="true" />}
            onClick={handleSetDefault}
            aria-label={`Set ${provider.display_name} as default`}
          >
            Set Default
          </GlassButton>
        )}

        {/* Spacer */}
        <div className="flex-1" aria-hidden="true" />

        {/* Edit */}
        <GlassButton
          variant="ghost"
          size="sm"
          icon={<Pencil size={14} aria-hidden="true" />}
          onClick={() => onEdit(provider)}
          aria-label={`Edit ${provider.display_name}`}
        >
          Edit
        </GlassButton>

        {/* Delete */}
        <GlassButton
          variant="danger"
          size="sm"
          icon={<Trash2 size={14} aria-hidden="true" />}
          onClick={() => onDelete(provider)}
          aria-label={`Delete ${provider.display_name}`}
        >
          Delete
        </GlassButton>
      </div>
    </GlassCard>
  )
}
