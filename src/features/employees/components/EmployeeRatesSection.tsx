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
import { formatIsoDateRu } from '@/features/employees/salaryUtils'
import { EmployeeRateModal } from './EmployeeRateModal'

interface EmployeeRatesSectionProps {
  employeeId: string
}

export function EmployeeRatesSection({ employeeId }: EmployeeRatesSectionProps) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Ставки оплаты</h3>
        <Button type="button" size="sm" onClick={openCreate} className="bg-primary hover:bg-primary-hover">
          <Plus className="size-4" />
          Добавить ставку
        </Button>
      </div>

      <SectionHelp title="Как настроить ставки" items={employeesHelp} />

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
          action={{ label: 'Добавить ставку', onClick: openCreate }}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип работы</TableHead>
                <TableHead>Ставка руб/ч</TableHead>
                <TableHead>Порог ч</TableHead>
                <TableHead>Переработка ×</TableHead>
                <TableHead>Действует с</TableHead>
                <TableHead>До</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    {rate.workTypeName ?? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Базовая
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{rate.rate.toLocaleString('ru-RU')}</TableCell>
                  <TableCell>{rate.overtimeThresholdHours}</TableCell>
                  <TableCell>{rate.overtimeMultiplier}</TableCell>
                  <TableCell>{formatIsoDateRu(rate.validFrom)}</TableCell>
                  <TableCell>{formatIsoDateRu(rate.validTo)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Редактировать"
                        onClick={() => openEdit(rate)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Удалить"
                        disabled={deleteRate.isPending}
                        onClick={() => void deleteRate.mutateAsync(rate.id)}
                      >
                        {deleteRate.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EmployeeRateModal
        open={modalOpen}
        employeeId={employeeId}
        rate={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
