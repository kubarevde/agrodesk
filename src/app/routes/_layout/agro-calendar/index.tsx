import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const AgroCalendarPage = lazy(() =>
  import('@/features/agro-calendar/components/AgroCalendarPage').then((module) => ({
    default: module.AgroCalendarPage,
  })),
)

export const Route = createFileRoute('/_layout/agro-calendar/')({
  beforeLoad: makeSectionBeforeLoad('agro-calendar'),
  component: AgroCalendarPage,
})
