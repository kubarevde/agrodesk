import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const SupportTicketPage = lazy(() =>
  import('@/features/support/components/SupportTicketPage').then((module) => ({
    default: module.SupportTicketPage,
  })),
)

function SupportTicketRoute() {
  const { ticketId } = Route.useParams()
  return <SupportTicketPage ticketId={ticketId} />
}

export const Route = createFileRoute('/_layout/support/$ticketId')({
  component: SupportTicketRoute,
})
