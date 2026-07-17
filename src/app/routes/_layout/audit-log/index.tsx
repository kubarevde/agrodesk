import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const AuditLogPage = lazy(() =>
  import('@/features/audit-log/components/AuditLogPage').then((module) => ({
    default: module.AuditLogPage,
  })),
)

export const Route = createFileRoute('/_layout/audit-log/')({
  beforeLoad: makeSectionBeforeLoad('audit-log'),
  component: AuditLogPage,
})
