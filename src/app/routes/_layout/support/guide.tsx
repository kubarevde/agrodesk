import { createFileRoute } from '@tanstack/react-router'
import { SystemGuidePage } from '@/features/help/components/SystemGuidePage'

type GuideSearch = {
  section?: string
}

export const Route = createFileRoute('/_layout/support/guide')({
  validateSearch: (search: Record<string, unknown>): GuideSearch => ({
    section: typeof search.section === 'string' ? search.section : undefined,
  }),
  component: GuideRoute,
})

function GuideRoute() {
  const { section } = Route.useSearch()
  return <SystemGuidePage section={section} />
}
