import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const FieldsPage = lazy(() =>
  import('@/features/fields/components/FieldsPage').then((module) => ({
    default: module.FieldsPage,
  })),
)

export const Route = createFileRoute('/_layout/fields/')({
  beforeLoad: makeSectionBeforeLoad('fields'),
  component: FieldsPage,
})
