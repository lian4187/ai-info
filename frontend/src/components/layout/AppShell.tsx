import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAppStore } from '../../store/appStore'

interface AppShellProps {
  children: React.ReactNode
  topBarTitle?: string
  showSearch?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

export function AppShell({
  children,
  topBarTitle,
  showSearch = false,
  onRefresh,
  refreshing,
}: AppShellProps) {
  const closeSidebar = useAppStore((s) => s.closeSidebar)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — fixed on desktop, slide-over on mobile */}
      <Sidebar onClose={closeSidebar} />

      {/* Main content area — offset by sidebar width on md+ */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <TopBar
          title={topBarTitle}
          showSearch={showSearch}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
