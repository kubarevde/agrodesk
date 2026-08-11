import { Link } from '@tanstack/react-router'
import { ClipboardList, Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadMoreButton } from '@/components/shared/LoadMoreButton'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InventoryOperation } from '@/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { usePagedItems } from '@/hooks/usePagedItems'
import { cn } from '@/lib/utils'
import { getInventoryOperationLabel } from '../utils'

interface InventoryOperationsTableProps {
  operations: InventoryOperation[]
  isLoading: boolean
  title?: string
  showViewAll?: boolean
  headerExtra?: ReactNode
  pageSize?: number
}

export function InventoryOperationsTable({
  operations,
  isLoading,
  title = 'Последние операции',
  showViewAll = false,
  headerExtra,
  pageSize = 20,
}: InventoryOperationsTableProps) {
  const isMobile = useIsMobile(639)
  const page = usePagedItems(operations, String(operations.length), pageSize)

  const header = (
    <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      <div className="flex flex-wrap items-center gap-2">
        {headerExtra}
        {showViewAll ? (
          <Link
            to="/inventory/operations"
            className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 sm:min-h-9')}
          >
            Посмотреть все
          </Link>
        ) : null}
      </div>
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card>
        {header}
        <CardContent>
          <SkeletonTable rows={5} columns={isMobile ? 1 : 5} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {header}
      <CardContent className="space-y-3">
        {operations.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Операций пока нет"
            description="Здесь появятся приходы, расходы и корректировки ТМЦ"
          />
        ) : isMobile ? (
          <>
            <ul className="space-y-2">
              {page.visible.map((operation) => (
                <li
                  key={operation.id}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{operation.date}</p>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 text-xs font-medium',
                        operation.type === 'income' ? 'text-success' : 'text-destructive',
                      )}
                    >
                      {operation.type === 'income' ? (
                        <Plus className="size-3.5" />
                      ) : (
                        <Minus className="size-3.5" />
                      )}
                      {getInventoryOperationLabel(operation)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{operation.itemName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {operation.quantity.toLocaleString('ru-RU')} → остаток{' '}
                    {operation.stockAfter.toLocaleString('ru-RU')}
                  </p>
                </li>
              ))}
            </ul>
            <LoadMoreButton
              shown={page.shown}
              total={page.total}
              hasMore={page.hasMore}
              onLoadMore={page.loadMore}
            />
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
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
                  {page.visible.map((operation) => (
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
                          {getInventoryOperationLabel(operation)}
                        </span>
                      </TableCell>
                      <TableCell>{operation.itemName}</TableCell>
                      <TableCell>{operation.quantity.toLocaleString('ru-RU')}</TableCell>
                      <TableCell>{operation.stockAfter.toLocaleString('ru-RU')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <LoadMoreButton
              shown={page.shown}
              total={page.total}
              hasMore={page.hasMore}
              onLoadMore={page.loadMore}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
