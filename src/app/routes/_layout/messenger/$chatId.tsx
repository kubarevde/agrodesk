import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/messenger/$chatId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/workspace',
      search: { tab: 'messenger', chatId: params.chatId },
      replace: true,
    })
  },
  component: () => null,
})
