import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface GlassSelectProps {
  options: SelectOption[]
  label?: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function GlassSelect({
  options,
  label,
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  id,
  className = '',
}: GlassSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-white/70 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className={[
            'w-full appearance-none bg-white/5 border rounded-xl px-4 py-3 pr-10',
            'text-white text-sm',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20'
              : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'cursor-pointer',
            className,
          ].join(' ')}
        >
          {placeholder && (
            <option value="" disabled className="bg-slate-900 text-white/50">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-slate-900 text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom dropdown arrow */}
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          size={16}
          aria-hidden="true"
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400 mt-0.5">
          {error}
        </p>
      )}
    </div>
  )
}
