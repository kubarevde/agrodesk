import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const MessengerPage = lazy(() =>
  import('@/features/messenger/components/MessengerPage').then((m) => ({
    default: m.MessengerPage,
  })),
)

export const Route = createFileRoute('/_layout/messenger/')({
  component: MessengerPage,
})
