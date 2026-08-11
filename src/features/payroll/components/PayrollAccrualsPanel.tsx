import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePayrollRuns } from '../hooks'
import { CreatePayrollRunDialog } from './CreatePayrollRunDialog'
import { PayrollRunDetail } from './PayrollRunDetail'
import { PayrollRunsTable } from './PayrollRunsTable'

type Props = {
  runId: string | null
  canConfirm: boolean
  canPay: boolean
  canViewAll: boolean
  onOpenRun: (id: string) => void
  onClearRun: () => void
}

export function PayrollAccrualsPanel({
  runId,
  canConfirm,
  canPay,
  onOpenRun,
  onClearRun,
}: Props) {
  const { data: runs = [], isLoading, isError, refetch, isFetching } = usePayrollRuns()
  const [createOpen, setCreateOpen] = useState(false)

  if (runId) {
    return (
      <PayrollRunDetail
        runId={runId}
        canConfirm={canConfirm}
        canPay={canPay}
        onBack={onClearRun}
      />
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Черновики и подтверждённые начисления за период
        </p>
        <Button
          type="button"
          className="min-h-11 w-full bg-primary hover:bg-primary-hover sm:w-auto sm:min-h-10"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Создать начисление
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <EmptyState
          icon={Plus}
          title="Не удалось загрузить начисления"
          description="Проверьте соединение с сервером и права доступа, затем повторите"
          action={{ label: 'Повторить', onClick: () => void refetch() }}
        />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Начислений пока нет"
          description="Создайте черновик за календарный месяц или произвольный период"
          action={{ label: 'Создать начисление', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="min-w-0 space-y-2">
          {isFetching ? (
            <p className="text-xs text-muted-foreground">Обновление списка…</p>
          ) : null}
          <PayrollRunsTable runs={runs} canConfirm={canConfirm} onOpen={onOpenRun} />
        </div>
      )}

      <CreatePayrollRunDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existing={runs}
        onCreated={(id) => {
          setCreateOpen(false)
          onOpenRun(id)
        }}
      />
    </div>
  )
}
