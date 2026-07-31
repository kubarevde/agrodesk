import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const MessengerPageLazy = lazy(() =>
  import('@/features/messenger/components/MessengerPage').then((m) => ({
    default: m.MessengerPage,
  })),
)

function MessengerChatRoute() {
  const { chatId } = Route.useParams()
  return <MessengerPageLazy chatId={chatId} />
}

export const Route = createFileRoute('/_layout/messenger/$chatId')({
  component: MessengerChatRoute,
})
