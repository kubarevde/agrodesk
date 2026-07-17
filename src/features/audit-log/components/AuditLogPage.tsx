import { History } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { useCurrentUser } from '@/features/auth/hooks'
import { useEmployees } from '@/features/employees/hooks'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAuditLog } from '../hooks'
import type { AuditLogEntry } from '../types'
import { canViewAudit } from '../types'
import { AuditDiffDialog } from './AuditDiffDialog'
import { AuditLogFiltersBar } from './AuditLogFiltersBar'
import { AuditLogList } from './AuditLogList'
import { auditLogHelp } from '@/features/help/modules'

export function AuditLogPage() {
  const { data: user } = useCurrentUser()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [entityType, setEntityType] = useState<string>()
  const [employeeId, setEmployeeId] = useState<string>()
  const [action, setAction] = useState<string>()
  const [fromDate, setFromDate] = useState<string>()
  const [toDate, setToDate] = useState<string>()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)
  const [itemsAcc, setItemsAcc] = useState<AuditLogEntry[]>([])

  const filters = useMemo(
    () => ({
      entityType,
      employeeId,
      action,
      fromDate,
      toDate,
      page,
      pageSize: isMobile ? 15 : 20,
    }),
    [action, employeeId, entityType, fromDate, page, toDate, isMobile],
  )

  const allowed = canViewAudit(user?.role)
  const { data, isLoading, isError } = useAuditLog(filters, allowed)
  const { data: employees = [] } = useEmployees()

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить историю изменений')
  }, [isError])

  useEffect(() => {
    if (!allowed || !data) return
    if (page === 1) setItemsAcc(data.items ?? [])
    else setItemsAcc((prev) => [...prev, ...(data.items ?? [])])
  }, [allowed, data, page])

  const employeeOptions = useMemo(
    () => employees.map((emp) => ({ id: emp.id, name: emp.employeeName || emp.employeeCode })),
    [employees],
  )

  if (!allowed) {
    return (
      <EmptyState
        icon={History}
        title="Нет доступа"
        description="История изменений доступна менеджерам и администраторам."
      />
    )
  }

  const items = itemsAcc
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 50
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const resetPage = (fn: (v?: string) => void) => (v?: string) => {
    fn(v)
    setPage(1)
    setItemsAcc([])
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">История изменений</h1>
        <p className="text-sm text-muted-foreground">Кто, когда и что менял в системе</p>
      </div>

      <AuditLogFiltersBar
        entityType={entityType}
        employeeId={employeeId}
        action={action}
        fromDate={fromDate}
        toDate={toDate}
        employees={employeeOptions}
        onEntityType={resetPage(setEntityType)}
        onEmployeeId={resetPage(setEmployeeId)}
        onAction={resetPage(setAction)}
        onFromDate={resetPage(setFromDate)}
        onToDate={resetPage(setToDate)}
      />

      {isLoading && items.length === 0 ? (
        <PageSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={History}
          title="Записей нет"
          description="Измените фильтры или выполните действие в системе."
        />
      ) : (
        <AuditLogList items={items} isMobile={isMobile} onDetails={setSelected} />
      )}

      {page < totalPages ? (
        <div className="flex justify-center pt-2">
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка…' : 'Загрузить ещё'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Всего {total} записей
            </p>
          </div>
        </div>
      ) : null}

      <SectionHelp title="Справка: история изменений" items={auditLogHelp} />

      <AuditDiffDialog entry={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </div>
  )
}
