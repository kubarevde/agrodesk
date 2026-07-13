import { create } from 'zustand'

interface LayoutState {
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
}))
