import { createFileRoute } from '@tanstack/react-router'
import { SupportTicketDetailPage } from '@/features/superadmin/components/SupportTicketDetailPage'

function SupportTicketRoute() {
  const { ticketId } = Route.useParams()
  return <SupportTicketDetailPage ticketId={ticketId} />
}

export const Route = createFileRoute('/superadmin/_authenticated/support/$ticketId')({
  component: SupportTicketRoute,
})
