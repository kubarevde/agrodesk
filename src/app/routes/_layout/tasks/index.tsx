import { createFileRoute, redirect } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

export const Route = createFileRoute('/_layout/tasks/')({
  beforeLoad: async (ctx) => {
    await makeSectionBeforeLoad('tasks')(ctx)
    throw redirect({
      to: '/workspace',
      search: { tab: 'tasks' },
      replace: true,
    })
  },
  component: () => null,
})
