import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useConfirmPayrollRun } from '../hooks'
import { PAYROLL_ACTION_HINTS } from '../labels'
import type { PayrollRun } from '../types'

const employeesRoute = getRouteApi('/_layout/employees/')

type Props = {
  run: PayrollRun
  canConfirm: boolean
}

export function PayrollRunRowActions({ run, canConfirm }: Props) {
  const confirm = useConfirmPayrollRun()
  const salaryNavigate = employeesRoute.useNavigate()
  const navigate = useNavigate()

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
      {run.status === 'draft' &&
        (canConfirm ? (
          <Button
            size="sm"
            className="min-h-11 sm:min-h-7"
            disabled={confirm.isPending}
            onClick={() => confirm.mutate(run.id)}
          >
            Подтвердить
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              className={cn(
                buttonVariants({ size: 'sm' }),
                'min-h-11 w-full cursor-not-allowed opacity-50 sm:min-h-7 sm:w-auto',
              )}
              disabled
            >
              Подтвердить
            </TooltipTrigger>
            <TooltipContent>{PAYROLL_ACTION_HINTS.confirm}</TooltipContent>
          </Tooltip>
        ))}
      {(run.status === 'confirmed' || run.status === 'paid') && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 sm:min-h-7"
          onClick={() =>
            void salaryNavigate({
              search: { tab: 'salary', payroll: 'payouts', runId: run.id },
            })
          }
        >
          Выдача
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11 sm:min-h-7"
        onClick={() =>
          void navigate({
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
    </div>
  )
}
