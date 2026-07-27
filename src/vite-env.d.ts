/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_MAP_TILES_URL?: string
  readonly VITE_MAP_TILES_ATTRIBUTION?: string
  readonly VITE_MAP_SATELLITE_URL?: string
  readonly VITE_MAP_SATELLITE_ATTRIBUTION?: string
  readonly VITE_MAP_DEFAULT_BASEMAP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}
