import { createFileRoute, Outlet } from '@tanstack/react-router'

/** Public marketplace layout — no auth, no org shell. */
export const Route = createFileRoute('/market')({
  component: () => <Outlet />,
})
