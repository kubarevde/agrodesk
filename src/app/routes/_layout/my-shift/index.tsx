import { createFileRoute, redirect } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

export const Route = createFileRoute('/_layout/my-shift/')({
  beforeLoad: async (ctx) => {
    await makeSectionBeforeLoad('my-shift')(ctx)
    throw redirect({
      to: '/workspace',
      search: { tab: 'shift' },
      replace: true,
    })
  },
  component: () => null,
})
