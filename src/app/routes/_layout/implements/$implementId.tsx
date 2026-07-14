import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Wrench } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useImplementDetail } from '@/features/implements/hooks'
import { conditionClass, conditionLabel } from '@/features/implements/types'

function ImplementDetailRoute() {
  const navigate = useNavigate()
  const { implementId } = Route.useParams()
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
        <Badge variant="secondary">{item.category}</Badge>
        <Badge className={conditionClass(item.condition)}>{conditionLabel(item.condition)}</Badge>
      </div>
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
    </div>
  )
}

export const Route = createFileRoute('/_layout/implements/$implementId')({
  component: ImplementDetailRoute,
})
