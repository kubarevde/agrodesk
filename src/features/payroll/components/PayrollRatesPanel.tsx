import { Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
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
import { EmployeeRateModal } from '@/features/employees/components/EmployeeRateModal'
import { EmployeeRatesSection } from '@/features/employees/components/EmployeeRatesSection'
import { useEmployees } from '@/features/employees/hooks'
import { useAllEmployeeRates } from '@/features/employees/salaryHooks'
import { formatIsoDateRu, formatMoney } from '@/features/employees/salaryUtils'
import type { EmployeeRate, PaymentScheme } from '@/features/employees/types'
import { SCHEME_LABELS } from '../types'

type Props = {
  canManage: boolean
  canView: boolean
}

function schemeUnit(rate: EmployeeRate): string {
  if (rate.paymentScheme === 'hourly') return `${formatMoney(rate.rate)} / ч`
  if (rate.paymentScheme === 'per_shift') return `${formatMoney(rate.rate)} / смена`
  if (rate.paymentScheme === 'monthly') return `${formatMoney(rate.rate)} / мес`
  return `${formatMoney(rate.rate)} / ${rate.pieceworkUnit ?? 'ед.'}`
}

function activeRate(rates: EmployeeRate[], today: string): EmployeeRate | null {
  const active = rates.filter(
    (r) => r.validFrom <= today && (r.validTo == null || r.validTo >= today),
  )
  if (active.length === 0) return null
  return active.sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] ?? null
}

export function PayrollRatesPanel({ canManage, canView }: Props) {
  const { data: employees = [], isLoading: empLoading } = useEmployees({ enabled: canView })
  const { data: rates = [], isLoading: ratesLoading } = useAllEmployeeRates(canView)
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null)
  const [modalEmployeeId, setModalEmployeeId] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const byEmployee = useMemo(() => {
    const map = new Map<string, EmployeeRate[]>()
    for (const rate of rates) {
      const list = map.get(rate.employeeId) ?? []
      list.push(rate)
      map.set(rate.employeeId, list)
    }
    return map
  }, [rates])

  if (!canView) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
        Нет права просмотра ставок. Обратитесь к администратору, чтобы выдали доступ к ставкам
        или просмотру начислений всех сотрудников.
      </p>
    )
  }

  if (empLoading || ratesLoading) return <Skeleton className="h-40 w-full" />

  if (historyEmployeeId) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setHistoryEmployeeId(null)}>
          ← К списку
        </Button>
        <EmployeeRatesSection employeeId={historyEmployeeId} canManage={canManage} />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-muted-foreground">
        Текущие активные схемы оплаты. История ставок — в карточке сотрудника.
      </p>
      {employees.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Нет сотрудников"
          description="Добавьте сотрудников в списке"
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {employees.map((emp) => {
              const current = activeRate(byEmployee.get(emp.id) ?? [], today)
              const scheme = (current?.paymentScheme ?? 'hourly') as PaymentScheme
              return (
                <li key={emp.id} className="rounded-lg border border-border bg-surface p-3">
                  <p className="font-medium">{emp.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Схема</dt>
                      <dd>{current ? SCHEME_LABELS[scheme] : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Ставка</dt>
                      <dd>{current ? schemeUnit(current) : 'нет ставки'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Действует с</dt>
                      <dd>{current ? formatIsoDateRu(current.validFrom) : '—'}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-11 w-full sm:min-h-10 sm:w-auto"
                      onClick={() => setHistoryEmployeeId(emp.id)}
                    >
                      История
                    </Button>
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 w-full sm:min-h-10 sm:w-auto"
                        onClick={() => setModalEmployeeId(emp.id)}
                      >
                        Изменить
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Схема</TableHead>
                  <TableHead>Ставка</TableHead>
                  <TableHead>С</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const current = activeRate(byEmployee.get(emp.id) ?? [], today)
                  const scheme = (current?.paymentScheme ?? 'hourly') as PaymentScheme
                  return (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="font-medium">{emp.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{emp.employeeCode}</div>
                      </TableCell>
                      <TableCell>{current ? SCHEME_LABELS[scheme] : '—'}</TableCell>
                      <TableCell>{current ? schemeUnit(current) : 'нет ставки'}</TableCell>
                      <TableCell>
                        {current ? formatIsoDateRu(current.validFrom) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryEmployeeId(emp.id)}
                          >
                            История
                          </Button>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setModalEmployeeId(emp.id)}
                            >
                              Изменить
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {modalEmployeeId && (
        <EmployeeRateModal
          open
          employeeId={modalEmployeeId}
          onClose={() => setModalEmployeeId(null)}
        />
      )}
    </div>
  )
}
