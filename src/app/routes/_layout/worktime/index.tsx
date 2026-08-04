import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const WorktimePage = lazy(() =>
  import('@/features/worktime/components/WorktimePage').then((module) => ({
    default: module.WorktimePage,
  })),
)

type WorktimeSearch = {
  field_id?: string
}

export const Route = createFileRoute('/_layout/worktime/')({
  beforeLoad: makeSectionBeforeLoad('worktime'),
  validateSearch: (search: Record<string, unknown>): WorktimeSearch => ({
    field_id: typeof search.field_id === 'string' && search.field_id ? search.field_id : undefined,
  }),
  component: WorktimePage,
})
