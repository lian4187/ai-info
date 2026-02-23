import React from 'react'

type SkeletonVariant = 'card' | 'list' | 'text'

interface LoadingSkeletonProps {
  variant?: SkeletonVariant
  count?: number
  className?: string
}

function CardSkeleton() {
  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded-lg w-3/4" />
          <div className="h-3 bg-white/10 rounded-lg w-1/2" />
        </div>
      </div>
      {/* Body lines */}
      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded-lg w-full" />
        <div className="h-3 bg-white/10 rounded-lg w-5/6" />
        <div className="h-3 bg-white/10 rounded-lg w-4/6" />
      </div>
      {/* Footer */}
      <div className="mt-4 flex gap-2">
        <div className="h-6 bg-white/10 rounded-lg w-16" />
        <div className="h-6 bg-white/10 rounded-lg w-20" />
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-white/10 rounded-lg w-2/3" />
        <div className="h-3 bg-white/10 rounded-lg w-1/3" />
      </div>
      <div className="w-16 h-6 bg-white/10 rounded-lg shrink-0" />
    </div>
  )
}

function TextSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-white/10 rounded-lg w-full" />
      <div className="h-4 bg-white/10 rounded-lg w-11/12" />
      <div className="h-4 bg-white/10 rounded-lg w-4/5" />
    </div>
  )
}

const skeletonMap: Record<SkeletonVariant, React.ComponentType> = {
  card: CardSkeleton,
  list: ListSkeleton,
  text: TextSkeleton,
}

export function LoadingSkeleton({
  variant = 'card',
  count = 1,
  className = '',
}: LoadingSkeletonProps) {
  const SkeletonItem = skeletonMap[variant]

  return (
    <div
      className={[
        variant === 'card' ? 'grid gap-4' : 'flex flex-col gap-3',
        className,
      ].join(' ')}
      aria-label="Loading..."
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonItem key={i} />
      ))}
    </div>
  )
}
