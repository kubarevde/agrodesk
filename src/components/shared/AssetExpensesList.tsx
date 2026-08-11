import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/features/expenses/utils'

export type AssetExpenseRow = {
  id: string
  date: string
  category: string
  amount: number
  description: string | null
}

type AssetExpensesListProps = {
  rows: AssetExpenseRow[]
  emptyLabel: string
  categoryHeader: string
}

export function AssetExpensesList({
  rows,
  emptyLabel,
  categoryHeader,
}: AssetExpensesListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>{categoryHeader}</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Описание</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{formatMoney(row.amount)}</TableCell>
                <TableCell className="max-w-48 truncate">{row.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{row.category}</p>
                <p className="text-xs text-muted-foreground">{row.date}</p>
              </div>
              <p className="shrink-0 font-medium text-foreground">
                {formatMoney(row.amount)}
              </p>
            </div>
            {row.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{row.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  )
}
