import { createFileRoute, redirect } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

export const Route = createFileRoute('/_layout/shipment-requests/my')({
  beforeLoad: async (ctx) => {
    await makeActionBeforeLoad('shipment_requests.execute')(ctx)
    throw redirect({
      to: '/workspace',
      search: { tab: 'requests' },
      replace: true,
    })
  },
  component: () => null,
})
