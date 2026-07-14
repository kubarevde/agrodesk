import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const NotificationsPage = lazy(() =>
  import('@/features/notifications/components/NotificationsPage').then((module) => ({
    default: module.NotificationsPage,
  })),
)

export const Route = createFileRoute('/_layout/notifications/')({
  component: NotificationsPage,
})
