import { Loader2, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Badge } from '@/components/ui/badge'
import { employeesHelp } from '@/features/help/content'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useDeleteEmployeeRate,
  useEmployeeRates,
} from '@/features/employees/salaryHooks'
import type { EmployeeRate } from '@/features/employees/types'
import { formatIsoDateRu, formatMoney } from '@/features/employees/salaryUtils'
import { schemeLabel } from '@/features/payroll/labels'
import { EmployeeRateModal } from './EmployeeRateModal'

interface EmployeeRatesSectionProps {
  employeeId: string
  /** When false, hide create/edit/delete (view-only). Default true for sheet. */
  canManage?: boolean
}

function RateActions({
  rate,
  canManage,
  deleting,
  onEdit,
  onDelete,
}: {
  rate: EmployeeRate
  canManage: boolean
  deleting: boolean
  onEdit: (rate: EmployeeRate) => void
  onDelete: (id: string) => void
}) {
  if (!canManage) return null
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="min-h-10 sm:min-h-8"
        aria-label="Редактировать"
        onClick={() => onEdit(rate)}
      >
        <Pencil className="size-4" />
        <span className="sm:hidden">Изменить</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="min-h-10 sm:min-h-8"
        aria-label="Удалить"
        disabled={deleting}
        onClick={() => onDelete(rate.id)}
      >
        {deleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4 text-destructive" />
        )}
        <span className="sm:hidden">Удалить</span>
      </Button>
    </div>
  )
}

export function EmployeeRatesSection({
  employeeId,
  canManage = true,
}: EmployeeRatesSectionProps) {
  const { data: rates = [], isLoading } = useEmployeeRates(employeeId)
  const deleteRate = useDeleteEmployeeRate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeRate | null>(null)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (rate: EmployeeRate) => {
    setEditing(rate)
    setModalOpen(true)
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Ставки оплаты</h3>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            className="min-h-10 bg-primary hover:bg-primary-hover sm:min-h-8"
          >
            <Plus className="size-4" />
            Добавить ставку
          </Button>
        ) : null}
      </div>

      <SectionHelp section="ставки оплаты" items={employeesHelp} />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rates.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Ставок нет"
          description="Добавьте ставку по типу работ или базовую"
          action={
            canManage ? { label: 'Добавить ставку', onClick: openCreate } : undefined
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {rates.map((rate) => (
              <li
                key={rate.id}
                className="rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <p className="font-medium text-foreground">
                  {schemeLabel(rate.paymentScheme)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {rate.workTypeName ?? 'Базовая ставка'} · {formatMoney(rate.rate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatIsoDateRu(rate.validFrom)}
                  {rate.validTo ? ` — ${formatIsoDateRu(rate.validTo)}` : ' — бессрочно'}
                </p>
                <div className="mt-2">
                  <RateActions
                    rate={rate}
                    canManage={canManage}
                    deleting={deleteRate.isPending}
                    onEdit={openEdit}
                    onDelete={(id) => void deleteRate.mutateAsync(id)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Схема</TableHead>
                  <TableHead>Тип работы</TableHead>
                  <TableHead>Ставка</TableHead>
                  <TableHead>Действует с</TableHead>
                  <TableHead>До</TableHead>
                  {canManage ? <TableHead>Действия</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>{schemeLabel(rate.paymentScheme)}</TableCell>
                    <TableCell>
                      {rate.workTypeName ?? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Базовая
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatMoney(rate.rate)}</TableCell>
                    <TableCell>{formatIsoDateRu(rate.validFrom)}</TableCell>
                    <TableCell>{formatIsoDateRu(rate.validTo)}</TableCell>
                    {canManage ? (
                      <TableCell>
                        <RateActions
                          rate={rate}
                          canManage={canManage}
                          deleting={deleteRate.isPending}
                          onEdit={openEdit}
                          onDelete={(id) => void deleteRate.mutateAsync(id)}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {canManage ? (
        <EmployeeRateModal
          open={modalOpen}
          employeeId={employeeId}
          rate={editing}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
