import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/features/landing/LandingPage'

/**
 * Landing entry kept at /landing for structure.
 * Same public page also available at `/` via routes/index.tsx.
 */
export const Route = createFileRoute('/landing/')({
  component: LandingPage,
})
