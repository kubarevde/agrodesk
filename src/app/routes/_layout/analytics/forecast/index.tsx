import { createFileRoute, redirect } from '@tanstack/react-router'
import { makeAnySectionBeforeLoad } from '@/lib/routeSectionGuard'

/** Legacy URL — redirect into «Затраты и доходы» → «Факт и прогноз». */
export const Route = createFileRoute('/_layout/analytics/forecast/')({
  beforeLoad: async (opts) => {
    await makeAnySectionBeforeLoad(['expenses', 'analytics'])(opts)
    throw redirect({
      to: '/expenses',
      search: { tab: 'forecast' },
    })
  },
  component: () => null,
})
