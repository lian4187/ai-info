import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface AppState {
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void

  // Current page label (used by TopBar)
  currentPage: string
  setCurrentPage: (page: string) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      sidebarOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar'),

      openSidebar: () =>
        set({ sidebarOpen: true }, false, 'openSidebar'),

      closeSidebar: () =>
        set({ sidebarOpen: false }, false, 'closeSidebar'),

      currentPage: 'Dashboard',

      setCurrentPage: (page: string) =>
        set({ currentPage: page }, false, 'setCurrentPage'),
    }),
    { name: 'AppStore' }
  )
)
