import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'
import { parseSettingsTab } from '@/features/settings/settingsSections'

const SettingsPage = lazy(() =>
  import('@/features/settings/components/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)

export const Route = createFileRoute('/_layout/settings/')({
  beforeLoad: makeSectionBeforeLoad('settings'),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseSettingsTab(search.tab),
  }),
  component: SettingsPage,
})
