import React from 'react'
import type { LucideProps } from 'lucide-react'

interface EmptyStateProps {
  icon: React.ComponentType<LucideProps>
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="mb-5 p-5 rounded-2xl bg-white/5 border border-white/10">
        <Icon
          size={40}
          className="text-white/30"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      </div>

      <h3 className="text-lg font-semibold text-white/80 mb-2">{title}</h3>

      <p className="text-sm text-white/50 max-w-sm leading-relaxed">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
