import { useState } from 'react'
import { Sprout } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatAreaHa } from '../plantingTypes'
import {
  FULFILLMENT_LABELS,
  type RotationMatrix,
  type RotationMatrixCell,
  type RotationPlanWrite,
} from '../rotationTypes'
import { FieldRotationPlanForm } from './FieldRotationPlanForm'

type FieldRotationPanelProps = {
  matrix: RotationMatrix | undefined
  isLoading: boolean
  canManage: boolean
  pending: boolean
  onCreatePlan: (payload: RotationPlanWrite) => void
}

function cellTitle(cell: RotationMatrixCell): string {
  const crop = cell.cropName || cell.cropCode
  const variety = cell.varietyName ? ` · ${cell.varietyName}` : ''
  return `${crop}${variety}`
}

export function FieldRotationPanel({
  matrix,
  isLoading,
  canManage,
  pending,
  onCreatePlan,
}: FieldRotationPanelProps) {
  const [formOpen, setFormOpen] = useState(false)
  const nextYear = new Date().getFullYear() + 1

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const years = matrix?.years ?? []
  const hasAny = years.some((y) => y.cells.length > 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          План и факт по годам. Факт берётся только из культур на поле.
        </p>
        {canManage && !formOpen ? (
          <Button
            type="button"
            className="min-h-11 w-full sm:min-h-9 sm:w-auto"
            size="sm"
            onClick={() => setFormOpen(true)}
          >
            Добавить план
          </Button>
        ) : null}
      </div>

      {formOpen ? (
        <FieldRotationPlanForm
          defaultSeasonYear={nextYear}
          pending={pending}
          onCancel={() => setFormOpen(false)}
          onSubmit={(payload) => {
            onCreatePlan(payload)
            setFormOpen(false)
          }}
        />
      ) : null}

      {!hasAny && !formOpen ? (
        <EmptyState
          icon={Sprout}
          title="Севооборот пока пуст"
          description="Добавьте план на будущий год или культуры во вкладке «Культуры»."
          action={
            canManage
              ? { label: 'Добавить план', onClick: () => setFormOpen(true) }
              : undefined
          }
        />
      ) : null}

      {hasAny ? (
        <div className="space-y-3">
          {years.map((year) => {
            if (year.cells.length === 0) return null
            const plans = year.cells.filter((c) => c.kind === 'plan')
            const facts = year.cells.filter((c) => c.kind === 'fact')
            return (
              <div
                key={year.year}
                className="rounded-lg border border-border bg-surface/60 p-3"
              >
                <p className="mb-2 text-sm font-medium text-foreground">{year.year}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      План
                    </p>
                    {plans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Нет плана</p>
                    ) : (
                      plans.map((cell) => (
                        <div
                          key={`p-${cell.id}`}
                          className="rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                        >
                          <p className="font-medium text-foreground">{cellTitle(cell)}</p>
                          <p className="text-muted-foreground">
                            {formatAreaHa(cell.areaHa)}
                            {cell.fulfillment
                              ? ` · ${FULFILLMENT_LABELS[cell.fulfillment]}`
                              : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Факт
                    </p>
                    {facts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Нет посева</p>
                    ) : (
                      facts.map((cell) => (
                        <div
                          key={`f-${cell.id}`}
                          className="rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                        >
                          <p className="font-medium text-foreground">{cellTitle(cell)}</p>
                          <p className="text-muted-foreground">{formatAreaHa(cell.areaHa)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
