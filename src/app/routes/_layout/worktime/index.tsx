import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const WorktimePage = lazy(() =>
  import('@/features/worktime/components/WorktimePage').then((module) => ({
    default: module.WorktimePage,
  })),
)

export const Route = createFileRoute('/_layout/worktime/')({
  beforeLoad: makeSectionBeforeLoad('worktime'),
  component: WorktimePage,
})
