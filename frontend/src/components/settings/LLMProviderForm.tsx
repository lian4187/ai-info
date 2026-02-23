import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { GlassInput, GlassSelect } from '../common'
import type { LLMProviderConfig, LLMProviderType } from '../../types'

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

const PROVIDER_OPTIONS: { value: LLMProviderType; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'zhipu', label: 'Zhipu (智谱)' },
  { value: 'doubao', label: 'Doubao (豆包)' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai_compat', label: 'Custom (OpenAI-compat)' },
]

const DEFAULT_BASE_URLS: Record<LLMProviderType, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  minimax: 'https://api.minimax.chat/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openai_compat: '',
}

const DEFAULT_MODELS: Record<LLMProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-20250514',
  zhipu: 'glm-4-flash',
  doubao: 'doubao-pro-32k',
  minimax: 'abab6.5s-chat',
  gemini: 'gemini-2.0-flash',
  openai_compat: '',
}

// ---------------------------------------------------------------------------
// Form value type
// ---------------------------------------------------------------------------

export interface LLMProviderFormValues {
  provider_type: LLMProviderType
  display_name: string
  api_key: string
  base_url: string
  model_name: string
  temperature: number
  max_tokens: number
  is_default: boolean
}

interface LLMProviderFormProps {
  initialValues?: Partial<LLMProviderConfig>
  isEditing?: boolean
  onSubmit: (values: LLMProviderFormValues) => void
  isSubmitting?: boolean
  submitLabel?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LLMProviderForm({
  initialValues,
  isEditing = false,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
}: LLMProviderFormProps) {
  const [providerType, setProviderType] = useState<LLMProviderType>(
    initialValues?.provider_type ?? 'openai'
  )
  const [displayName, setDisplayName] = useState(initialValues?.display_name ?? '')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(
    initialValues?.base_url ?? DEFAULT_BASE_URLS['openai']
  )
  const [modelName, setModelName] = useState(initialValues?.model_name ?? DEFAULT_MODELS['openai'])
  const [temperature, setTemperature] = useState(initialValues?.temperature ?? 0.7)
  const [maxTokens, setMaxTokens] = useState(initialValues?.max_tokens ?? 2048)
  const [isDefault, setIsDefault] = useState(initialValues?.is_default ?? false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  useEffect(() => {
    if (!isEditing) {
      setBaseUrl(DEFAULT_BASE_URLS[providerType])
      setModelName(DEFAULT_MODELS[providerType])
    } else if (!initialValues?.base_url) {
      setBaseUrl(DEFAULT_BASE_URLS[providerType])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerType])

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!displayName.trim()) next.display_name = 'Display name is required'
    if (!isEditing && !apiKey.trim()) next.api_key = 'API key is required'
    if (!modelName.trim()) next.model_name = 'Model name is required'
    if (temperature < 0 || temperature > 2) next.temperature = 'Must be between 0 and 2'
    if (maxTokens < 1) next.max_tokens = 'Must be at least 1'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      provider_type: providerType,
      display_name: displayName.trim(),
      api_key: apiKey,
      base_url: baseUrl.trim(),
      model_name: modelName.trim(),
      temperature,
      max_tokens: maxTokens,
      is_default: isDefault,
    })
  }

  const temperatureDisplay = temperature.toFixed(1)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <GlassSelect
        label="Provider Type"
        value={providerType}
        onChange={(v) => setProviderType(v as LLMProviderType)}
        options={PROVIDER_OPTIONS}
      />

      <GlassInput
        label="Display Name"
        placeholder="e.g. My OpenAI Account"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        error={errors.display_name}
        required
        autoComplete="off"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/70 select-none">
          API Key{isEditing && <span className="text-white/40 ml-1">(leave blank to keep current)</span>}
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isEditing ? '••••••••••••  (unchanged)' : 'sk-...'}
            autoComplete="new-password"
            className={[
              'w-full bg-white/5 border rounded-xl px-4 py-3 pr-12',
              'text-white placeholder:text-white/30 text-sm',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2',
              errors.api_key
                ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20'
                : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20',
            ].join(' ')}
          />
          <button
            type="button"
            onClick={() => setShowApiKey((p) => !p)}
            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer"
          >
            {showApiKey ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
        {errors.api_key && (
          <p role="alert" className="text-xs text-red-400 mt-0.5">{errors.api_key}</p>
        )}
      </div>

      <GlassInput
        label="Base URL"
        placeholder="https://api.openai.com/v1"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />

      <GlassInput
        label="Model Name"
        placeholder="e.g. gpt-4o-mini"
        value={modelName}
        onChange={(e) => setModelName(e.target.value)}
        error={errors.model_name}
        autoComplete="off"
        required
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/70 select-none flex justify-between">
          <span>Temperature</span>
          <span className="text-white/50 tabular-nums">{temperatureDisplay}</span>
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-blue-500"
          aria-valuenow={temperature}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-label="Temperature"
        />
        <div className="flex justify-between text-xs text-white/30">
          <span>Precise (0)</span>
          <span>Creative (2)</span>
        </div>
      </div>

      <GlassInput
        label="Max Tokens"
        type="number"
        min={1}
        max={128000}
        value={maxTokens}
        onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1)}
        error={errors.max_tokens}
      />

      <label className="flex items-center gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-500 cursor-pointer"
        />
        <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
          Set as default provider
        </span>
      </label>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className={[
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm',
            'bg-blue-600 hover:bg-blue-500 text-white border border-transparent',
            'shadow-lg shadow-blue-900/30 transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          ].join(' ')}
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  )
}
