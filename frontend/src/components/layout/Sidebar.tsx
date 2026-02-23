import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Rss,
  Newspaper,
  FileText,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Feeds', to: '/feeds', icon: Rss },
  { label: 'Articles', to: '/articles', icon: Newspaper },
  { label: 'Digests', to: '/digests', icon: FileText },
  { label: 'Settings', to: '/settings', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 z-40 h-full w-64',
          'bg-white/5 backdrop-blur-xl border-r border-white/10',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          // Mobile: slide in/out; Desktop: always visible
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Main navigation"
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Sparkles
                size={18}
                className="text-blue-400"
                aria-hidden={true}
              />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              AI Info
            </span>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} aria-hidden={true} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Site navigation">
          <ul className="space-y-1" role="list">
            {navItems.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                      'transition-all duration-200',
                      isActive
                        ? 'bg-white/10 text-white border-l-2 border-blue-500 pl-[10px]'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/90 border-l-2 border-transparent pl-[10px]',
                    ].join(' ')
                  }
                >
                  <Icon size={18} aria-hidden={true} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer hint */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-xs text-white/25 leading-relaxed">
            AI News Aggregator v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
