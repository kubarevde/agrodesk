import { createFileRoute, redirect } from '@tanstack/react-router'

/** Legacy path — keep one public landing at `/`. */
export const Route = createFileRoute('/landing/')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
  component: () => null,
})
