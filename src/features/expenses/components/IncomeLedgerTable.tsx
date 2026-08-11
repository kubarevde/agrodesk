import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { IncomeLedgerEntry } from '@/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  formatIncomeMoney,
  getIncomeCategoryLabel,
  INCOME_SOURCE_LABELS,
} from '../incomeUtils'
import { getCategoryBadgeClass, PAYMENT_LABELS, type PaymentMethod } from '../utils'

interface IncomeLedgerTableProps {
  rows: IncomeLedgerEntry[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (entry: IncomeLedgerEntry) => void
  onDelete: (entry: IncomeLedgerEntry) => void
}

export function IncomeLedgerTable({
  rows,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: IncomeLedgerTableProps) {
  const { data: categories = [] } = useDictionary('income_category', { activeOnly: false })
  const showActions = canEdit || canDelete

  return (
    <div
      className="hidden overflow-x-auto rounded-lg border border-border md:block"
      data-layout="table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Источник</TableHead>
            <TableHead>Категория / позиция</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Контрагент</TableHead>
            <TableHead>Оплата</TableHead>
            {showActions ? <TableHead>Действия</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const categoryLabel =
              row.source === 'manual'
                ? getIncomeCategoryLabel(row.title, categories)
                : row.title
            const rowActions = [
              ...(canEdit
                ? [
                    {
                      id: 'edit',
                      label: 'Редактировать',
                      icon: Pencil,
                      onSelect: () => onEdit(row),
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      id: 'delete',
                      label: 'Удалить',
                      icon: Trash2,
                      variant: 'destructive' as const,
                      onSelect: () => onDelete(row),
                    },
                  ]
                : []),
            ]

            return (
              <TableRow key={row.id}>
                <TableCell>{row.date}</TableCell>
                <TableCell>
                  <Badge variant="outline">{INCOME_SOURCE_LABELS[row.source]}</Badge>
                </TableCell>
                <TableCell>
                  {row.source === 'manual' ? (
                    <Badge variant="outline" className={getCategoryBadgeClass(row.title)}>
                      {categoryLabel}
                    </Badge>
                  ) : (
                    <span className="font-medium text-foreground">{categoryLabel}</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{formatIncomeMoney(row.amount)}</TableCell>
                <TableCell>{row.description || '—'}</TableCell>
                <TableCell>{row.counterparty || '—'}</TableCell>
                <TableCell>
                  {row.paymentMethod
                    ? PAYMENT_LABELS[row.paymentMethod as PaymentMethod]
                    : '—'}
                </TableCell>
                {showActions ? (
                  <TableCell>
                    <CardActionsMenu
                      actions={rowActions}
                      title={row.description || categoryLabel}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
