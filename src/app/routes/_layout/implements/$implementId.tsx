import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'
import { ArrowLeft, Wrench } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { ToStatusBadge } from '@/features/equipment/components/ToStatusBadge'
import { ImplementCategoryBadge } from '@/features/implements/components/ImplementCategoryBadge'
import { useImplementDetail } from '@/features/implements/hooks'
import { implementToStatus } from '@/features/implements/types'
import { RepairHistorySection } from '@/features/repair-journal/components/RepairHistorySection'
import { AssetOperationalSummary } from '@/components/shared/AssetOperationalSummary'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { implementsHelp } from '@/features/help/content'

function ImplementDetailRoute() {
  const navigate = useNavigate()
  const { implementId } = Route.useParams()
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const { data: item, isLoading, isError } = useImplementDetail(implementId)

  if (isLoading) return <PageSkeleton />
  if (isError || !item) {
    return (
      <EmptyState
        icon={Wrench}
        title="Приспособление не найдено"
        description="Вернитесь к списку приспособлений."
        action={{ label: 'К списку', onClick: () => void navigate({ to: '/implements' }) }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-0 text-muted-foreground"
        onClick={() => void navigate({ to: '/implements' })}
      >
        <ArrowLeft className="size-4" />
        К списку
      </Button>
      <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
      <div className="flex flex-wrap gap-2">
        <ImplementCategoryBadge category={item.category} />
        <ToStatusBadge status={implementToStatus(item)} />
      </div>
      <AssetOperationalSummary implementId={item.id} implementName={item.name} />
      {item.current_equipment_name ? (
        <p className="text-sm text-muted-foreground">
          Прикреплено к: {item.current_equipment_name}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Свободно</p>
      )}
      {item.current_equipment_id ? (
        <Link
          to="/equipment/$equipmentId"
          params={{ equipmentId: item.current_equipment_id }}
          className="text-sm text-primary hover:underline"
        >
          Открыть технику
        </Link>
      ) : null}
      <RepairHistorySection implementId={item.id} canManage={canManage} />
      <SectionHelp title="Справка: приспособление" items={implementsHelp} />
    </div>
  )
}

export const Route = createFileRoute('/_layout/implements/$implementId')({
  beforeLoad: makeSectionBeforeLoad('implements'),
  component: ImplementDetailRoute,
})
