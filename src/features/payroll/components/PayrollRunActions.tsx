import { Download, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { downloadReport } from '@/features/reports/utils'
import { cn } from '@/lib/utils'
import {
  useConfirmPayrollRun,
  useRecalculatePayrollRun,
  useUnconfirmPayrollRun,
} from '../hooks'
import { PAYROLL_ACTION_HINTS } from '../labels'
import type { PayrollRun } from '../types'

const employeesRoute = getRouteApi('/_layout/employees/')

type Props = {
  run: PayrollRun
  canConfirm: boolean
}

export function PayrollRunActions({ run, canConfirm }: Props) {
  const confirm = useConfirmPayrollRun()
  const unconfirm = useUnconfirmPayrollRun()
  const recalc = useRecalculatePayrollRun()
  const navigate = employeesRoute.useNavigate()
  const appNavigate = useNavigate()
  const month = run.periodStart.slice(0, 7)
  const runId = run.id
  const [recalcOpen, setRecalcOpen] = useState(false)
  const isDraft = run.status === 'draft'

  const btnClass = 'min-h-11 w-full sm:min-h-8 sm:w-auto'

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:w-auto">
      {isDraft ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className={btnClass}
            disabled={recalc.isPending}
            onClick={() => setRecalcOpen(true)}
          >
            <RefreshCw className="size-4" />
            Пересчитать
          </Button>
          {canConfirm ? (
            <Button
              size="sm"
              className={btnClass}
              disabled={confirm.isPending}
              onClick={() => confirm.mutate(runId)}
            >
              Подтвердить
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  buttonVariants({ size: 'sm' }),
                  btnClass,
                  'cursor-not-allowed opacity-50',
                )}
                disabled
              >
                Подтвердить
              </TooltipTrigger>
              <TooltipContent>{PAYROLL_ACTION_HINTS.confirm}</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants({ size: 'sm', variant: 'outline' }),
              btnClass,
              'cursor-not-allowed opacity-50',
            )}
            disabled
          >
            <RefreshCw className="size-4" />
            Пересчитать
          </TooltipTrigger>
          <TooltipContent>
            Подтверждённое начисление нельзя пересчитать. Сначала отмените подтверждение,
            если по нему ещё не зафиксирована выдача
          </TooltipContent>
        </Tooltip>
      )}
      {run.status === 'confirmed' &&
        (canConfirm ? (
          <Button
            size="sm"
            variant="outline"
            className={btnClass}
            disabled={unconfirm.isPending}
            onClick={() => unconfirm.mutate(runId)}
          >
            Отменить подтверждение
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              className={cn(
                buttonVariants({ size: 'sm', variant: 'outline' }),
                btnClass,
                'cursor-not-allowed opacity-50',
              )}
              disabled
            >
              Отменить подтверждение
            </TooltipTrigger>
            <TooltipContent>{PAYROLL_ACTION_HINTS.confirm}</TooltipContent>
          </Tooltip>
        ))}
      {(run.status === 'confirmed' || run.status === 'paid') && (
        <Button
          size="sm"
          variant="outline"
          className={btnClass}
          onClick={() =>
            void navigate({ search: { tab: 'salary', payroll: 'payouts', runId } })
          }
        >
          К выдаче
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className={btnClass}
        onClick={() => {
          void downloadReport('/api/reports/salary', { month }, `salary_${month}.xlsx`)
            .then(() => toast.success('Excel скачан'))
            .catch(() => toast.error('Не удалось скачать Excel'))
        }}
      >
        <Download className="size-4" />
        Excel
      </Button>
      {(run.status === 'confirmed' || run.status === 'paid') && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={btnClass}
          onClick={() =>
            void appNavigate({
              to: '/expenses',
              search: {
                tab: 'expenses',
                category: 'salary',
                from: run.periodStart,
                to: run.periodEnd,
              },
            })
          }
        >
          Затраты
        </Button>
      )}

      <Dialog open={recalcOpen} onOpenChange={setRecalcOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Пересчитать начисление?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Система обновит суммы по сменам, ставкам, окладам и выработке. Премии, штрафы,
            удержания, авансы и другие уже зарегистрированные выплаты сохранятся.
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={() => setRecalcOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              disabled={recalc.isPending}
              onClick={() => {
                recalc.mutate(runId, {
                  onSuccess: () => setRecalcOpen(false),
                })
              }}
            >
              Пересчитать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
