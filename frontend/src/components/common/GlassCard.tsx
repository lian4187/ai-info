import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  as?: React.ElementType
}

export function GlassCard({
  children,
  className = '',
  onClick,
  hover = false,
  as: Tag = 'div',
}: GlassCardProps) {
  const isInteractive = hover || !!onClick

  const baseClasses =
    'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6'

  const hoverClasses = isInteractive
    ? 'hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer'
    : ''

  return (
    <Tag
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
