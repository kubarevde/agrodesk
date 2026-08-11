import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const FieldDetailPage = lazy(() =>
  import('@/features/fields/components/FieldDetailPage').then((module) => ({
    default: module.FieldDetailPage,
  })),
)

export type FieldDetailSearch = {
  addPlanting?: boolean
}

function FieldDetailRoute() {
  const { fieldId } = Route.useParams()
  const { addPlanting } = Route.useSearch()
  return <FieldDetailPage fieldId={fieldId} openAddPlanting={Boolean(addPlanting)} />
}

export const Route = createFileRoute('/_layout/fields/$fieldId')({
  beforeLoad: makeSectionBeforeLoad('fields'),
  validateSearch: (search: Record<string, unknown>): FieldDetailSearch => ({
    addPlanting: search.addPlanting === true || search.addPlanting === 'true' ? true : undefined,
  }),
  component: FieldDetailRoute,
})
