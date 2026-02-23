import React, { useId } from 'react'

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function GlassInput({
  label,
  error,
  className = '',
  id,
  ...inputProps
}: GlassInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-white/70 select-none"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        className={[
          'w-full bg-white/5 border rounded-xl px-4 py-3',
          'text-white placeholder:text-white/30 text-sm',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20'
            : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        ].join(' ')}
        {...inputProps}
      />

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400 mt-0.5">
          {error}
        </p>
      )}
    </div>
  )
}
