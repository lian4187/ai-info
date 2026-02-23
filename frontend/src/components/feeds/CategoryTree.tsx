import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Folders, Plus, Trash2, ChevronRight } from 'lucide-react'
import { GlassButton } from '../common'
import { deleteCategory, createCategory } from '../../api/feeds'
import type { FeedCategory, RSSFeed } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Counts how many feeds belong to a given category id. */
function feedCountForCategory(feeds: RSSFeed[], categoryId: number): number {
  return feeds.filter((f) => f.category_id === categoryId).length
}

// ---------------------------------------------------------------------------
// Add-category inline form
// ---------------------------------------------------------------------------

interface AddCategoryRowProps {
  onAdd: (name: string) => void
  isPending: boolean
}

function AddCategoryRow({ onAdd, isPending }: AddCategoryRowProps) {
  const [value, setValue] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1 px-2 mt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Category name…"
        disabled={isPending}
        className={[
          'flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg',
          'px-2.5 py-1.5 text-xs text-white placeholder:text-white/30',
          'focus:outline-none focus:ring-1 focus:ring-blue-500/40',
          'disabled:opacity-50',
        ].join(' ')}
        autoFocus
        aria-label="New category name"
      />
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className={[
          'p-1.5 rounded-lg text-xs font-medium transition-all duration-200',
          'bg-blue-600 hover:bg-blue-500 text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        ].join(' ')}
        aria-label="Save category"
      >
        <Plus size={13} aria-hidden="true" />
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Category row
// ---------------------------------------------------------------------------

interface CategoryRowProps {
  category: FeedCategory
  feedCount: number
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  isDeleting: boolean
}

function CategoryRow({
  category,
  feedCount,
  isActive,
  onSelect,
  onDelete,
  isDeleting,
}: CategoryRowProps) {
  return (
    <div
      className={[
        'group flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer',
        isActive
          ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300'
          : 'hover:bg-white/5 text-white/60 hover:text-white/90',
      ].join(' ')}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={isActive}
      aria-label={`Filter by category: ${category.name}`}
    >
      {isActive && (
        <ChevronRight size={13} className="shrink-0 text-blue-400" aria-hidden="true" />
      )}
      <span className="flex-1 text-sm font-medium truncate">{category.name}</span>
      <span
        className={[
          'text-xs px-1.5 py-0.5 rounded-md tabular-nums shrink-0',
          isActive
            ? 'bg-blue-500/20 text-blue-300/80'
            : 'bg-white/5 text-white/30',
        ].join(' ')}
        aria-label={`${feedCount} feeds`}
      >
        {feedCount}
      </span>

      {/* Delete button — appears on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        disabled={isDeleting}
        className={[
          'shrink-0 p-1 rounded-md transition-all duration-150 cursor-pointer',
          'opacity-0 group-hover:opacity-100',
          'text-white/30 hover:text-red-400 hover:bg-red-500/10',
          'disabled:pointer-events-none',
        ].join(' ')}
        aria-label={`Delete category ${category.name}`}
      >
        <Trash2 size={12} aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CategoryTreeProps {
  categories: FeedCategory[]
  feeds: RSSFeed[]
  selectedCategoryId: number | null
  onSelectCategory: (id: number | null) => void
}

export function CategoryTree({
  categories,
  feeds,
  selectedCategoryId,
  onSelectCategory,
}: CategoryTreeProps) {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = React.useState(false)

  const totalFeeds = feeds.length

  const { mutate: doDelete, variables: deletingId } = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: (_, id) => {
      toast.success('Category deleted')
      // If the deleted category was selected, reset to "All"
      if (selectedCategoryId === id) onSelectCategory(null)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })

  const { mutate: doCreate, isPending: creating } = useMutation({
    mutationFn: (name: string) => createCategory({ name }),
    onSuccess: (cat) => {
      toast.success(`Category "${cat.name}" created`)
      setShowAddForm(false)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const handleDeleteCategory = (cat: FeedCategory) => {
    if (!window.confirm(`Delete category "${cat.name}"? Feeds will be uncategorized.`)) return
    doDelete(cat.id)
  }

  return (
    <nav aria-label="Feed categories" className="flex flex-col gap-1">
      {/* Heading row */}
      <div className="flex items-center justify-between px-2 mb-1">
        <div className="flex items-center gap-2">
          <Folders size={14} className="text-white/40" aria-hidden="true" />
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Categories
          </span>
        </div>
        <GlassButton
          variant="ghost"
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => setShowAddForm((v) => !v)}
          aria-label="Add category"
        />
      </div>

      {/* "All" option */}
      <div
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer',
          selectedCategoryId === null
            ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300'
            : 'hover:bg-white/5 text-white/60 hover:text-white/90',
        ].join(' ')}
        role="button"
        tabIndex={0}
        onClick={() => onSelectCategory(null)}
        onKeyDown={(e) => e.key === 'Enter' && onSelectCategory(null)}
        aria-pressed={selectedCategoryId === null}
        aria-label="Show all feeds"
      >
        {selectedCategoryId === null && (
          <ChevronRight size={13} className="shrink-0 text-blue-400" aria-hidden="true" />
        )}
        <span className="flex-1 text-sm font-medium">All Feeds</span>
        <span
          className={[
            'text-xs px-1.5 py-0.5 rounded-md tabular-nums',
            selectedCategoryId === null
              ? 'bg-blue-500/20 text-blue-300/80'
              : 'bg-white/5 text-white/30',
          ].join(' ')}
          aria-label={`${totalFeeds} total feeds`}
        >
          {totalFeeds}
        </span>
      </div>

      {/* Category list */}
      {categories.map((cat) => (
        <CategoryRow
          key={cat.id}
          category={cat}
          feedCount={feedCountForCategory(feeds, cat.id)}
          isActive={selectedCategoryId === cat.id}
          onSelect={() => onSelectCategory(cat.id)}
          onDelete={() => handleDeleteCategory(cat)}
          isDeleting={deletingId === cat.id}
        />
      ))}

      {/* Inline add form */}
      {showAddForm && (
        <AddCategoryRow onAdd={doCreate} isPending={creating} />
      )}

      {categories.length === 0 && !showAddForm && (
        <p className="text-xs text-white/30 px-3 py-2">No categories yet</p>
      )}
    </nav>
  )
}
