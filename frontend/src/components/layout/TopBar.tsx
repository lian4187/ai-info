import { useState } from 'react'
import { Menu, RefreshCw, Search } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

interface TopBarProps {
  title?: string
  showSearch?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

export function TopBar({
  title,
  showSearch = false,
  onRefresh,
  refreshing = false,
}: TopBarProps) {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const currentPage = useAppStore((s) => s.currentPage)
  const [searchValue, setSearchValue] = useState('')

  const pageTitle = title ?? currentPage

  return (
    <header
      className={[
        'sticky top-0 z-20 h-16',
        'flex items-center px-4 gap-4',
        'bg-slate-900/70 backdrop-blur-xl border-b border-white/10',
      ].join(' ')}
    >
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer shrink-0"
        aria-label="Toggle navigation menu"
        aria-expanded={false}
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-white/90 flex-1 truncate">
        {pageTitle}
      </h1>

      {/* Right side actions */}
      <div className="flex items-center gap-2 shrink-0">
        {showSearch && (
          <div className="relative hidden sm:block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search..."
              aria-label="Search"
              className={[
                'pl-9 pr-4 py-2 w-48 bg-white/5 border border-white/10 rounded-xl',
                'text-sm text-white placeholder:text-white/30',
                'focus:outline-none focus:ring-2 focus:border-blue-500/50 focus:ring-blue-500/20',
                'transition-all duration-200',
              ].join(' ')}
            />
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            className={[
              'p-2 rounded-lg text-white/60 hover:text-white',
              'hover:bg-white/10 transition-all duration-200 cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            <RefreshCw
              size={18}
              className={refreshing ? 'animate-spin' : ''}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </header>
  )
}
