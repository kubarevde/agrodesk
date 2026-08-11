import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'
import { ImplementDetailPage } from '@/features/implements/components/ImplementDetailPage'

export const Route = createFileRoute('/_layout/implements/$implementId')({
  beforeLoad: makeSectionBeforeLoad('implements'),
  component: ImplementDetailRoute,
})

function ImplementDetailRoute() {
  const { implementId } = Route.useParams()
  return <ImplementDetailPage implementId={implementId} />
}
