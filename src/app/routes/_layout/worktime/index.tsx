import { createFileRoute } from '@tanstack/react-router'
import { WorktimePage } from '@/features/worktime/components/WorktimePage'

export const Route = createFileRoute('/_layout/worktime/')({
  component: WorktimePage,
})
