import { createFileRoute } from '@tanstack/react-router'
import { SupportInboxPage } from '@/features/superadmin/components/SupportInboxPage'

export const Route = createFileRoute('/superadmin/_authenticated/support/')({
  component: SupportInboxPage,
})
