import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const WorktimePage = lazy(() =>
  import('@/features/worktime/components/WorktimePage').then((module) => ({
    default: module.WorktimePage,
  })),
)

export const Route = createFileRoute('/_layout/worktime/')({
  component: WorktimePage,
})
