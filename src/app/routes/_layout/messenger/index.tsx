import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/messenger/')({
  beforeLoad: () => {
    throw redirect({
      to: '/workspace',
      search: { tab: 'messenger' },
      replace: true,
    })
  },
  component: () => null,
})
