import { create } from 'zustand'

interface PwaInstallState {
  deferredPrompt: BeforeInstallPromptEvent | null
  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void
}

/** Holds Chrome/Edge/Android install event until user taps «Установить». */
export const usePwaInstallStore = create<PwaInstallState>((set) => ({
  deferredPrompt: null,
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
}))
