import { ClipboardList, Minus, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InventoryOperation } from '@/types'
import { cn } from '@/lib/utils'

interface InventoryOperationsTableProps {
  operations: InventoryOperation[]
  isLoading: boolean
}

export function InventoryOperationsTable({ operations, isLoading }: InventoryOperationsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Последние операции
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={5} columns={5} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Последние операции
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {operations.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Операций пока нет"
            description="Здесь появятся приходы и расходы ТМЦ"
          />
        ) : (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Наименование</TableHead>
              <TableHead>Кол-во</TableHead>
              <TableHead>Остаток после</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((operation) => (
              <TableRow key={operation.id}>
                <TableCell>{operation.date}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-medium',
                      operation.type === 'income' ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {operation.type === 'income' ? (
                      <Plus className="size-3.5" />
                    ) : (
                      <Minus className="size-3.5" />
                    )}
                    {operation.type === 'income' ? 'Приход' : 'Расход'}
                  </span>
                </TableCell>
                <TableCell>{operation.itemName}</TableCell>
                <TableCell>{operation.quantity.toLocaleString('ru-RU')}</TableCell>
                <TableCell>{operation.stockAfter.toLocaleString('ru-RU')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  )
}
