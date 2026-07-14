import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const FieldsPage = lazy(() =>
  import('@/features/fields/components/FieldsPage').then((module) => ({
    default: module.FieldsPage,
  })),
)

export const Route = createFileRoute('/_layout/fields/')({
  component: FieldsPage,
})
