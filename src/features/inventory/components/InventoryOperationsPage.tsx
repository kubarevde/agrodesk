import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { buttonVariants } from '@/components/ui/button'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { cn } from '@/lib/utils'
import { useInventoryOperations } from '../hooks'
import { InventoryOperationsTable } from './InventoryOperationsTable'

type InventoryOperationsPageProps = {
  from?: string
  to?: string
  onRangeChange: (range: { from?: string; to?: string }) => void
}

export function InventoryOperationsPage({
  from,
  to,
  onRangeChange,
}: InventoryOperationsPageProps) {
  const range = {
    from: from ?? getDefaultMonthRange().from,
    to: to ?? getDefaultMonthRange().to,
  }
  const { data: operations = [], isLoading } = useInventoryOperations({
    from: range.from,
    to: range.to,
    limit: 500,
  })

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link
          to="/inventory"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            '-ml-2 min-h-11',
          )}
        >
          <ArrowLeft className="size-4" />
          К складу ТМЦ
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Операции склада</h1>
      </div>

      <DateRangePicker
        from={range.from}
        to={range.to}
        onChange={onRangeChange}
        className="w-full sm:w-auto"
      />

      <InventoryOperationsTable
        operations={operations}
        isLoading={isLoading}
        title="Все операции"
        pageSize={50}
      />
    </div>
  )
}
