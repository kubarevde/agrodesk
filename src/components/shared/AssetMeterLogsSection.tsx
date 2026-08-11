import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMeterDate } from '@/features/equipment/types'

export type AssetMeterLogRow = {
  id: string
  date: string
  value_added: number
  meter_after: number
  meter_label: string
  source?: 'manual' | 'shift' | string
  note?: string | null
  shift_label?: string | null
  created_by_name?: string | null
}

type AssetMeterLogsSectionProps = {
  title?: string
  logs: AssetMeterLogRow[]
  isLoading?: boolean
  canManage: boolean
  onAdd: () => void
  emptyLabel?: string
}

export function AssetMeterLogsSection({
  title = 'Журнал показаний',
  logs,
  isLoading = false,
  canManage,
  onAdd,
  emptyLabel = 'Записей пока нет',
}: AssetMeterLogsSectionProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {canManage ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-10"
            onClick={onAdd}
          >
            + Внести показания
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Добавлено</TableHead>
                  <TableHead>Итого</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Примечание</TableHead>
                  <TableHead>Кто</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatMeterDate(String(log.date))}</TableCell>
                    <TableCell>
                      +{log.value_added} {log.meter_label}
                    </TableCell>
                    <TableCell>
                      {log.meter_after} {log.meter_label}
                    </TableCell>
                    <TableCell>{log.source === 'shift' ? 'Смена' : 'Вручную'}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {log.note || log.shift_label || '—'}
                    </TableCell>
                    <TableCell>{log.created_by_name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      +{log.value_added} {log.meter_label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMeterDate(String(log.date))} ·{' '}
                      {log.source === 'shift' ? 'Смена' : 'Вручную'}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-foreground">
                    {log.meter_after} {log.meter_label}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {log.note || log.shift_label || '—'}
                  {log.created_by_name ? ` · ${log.created_by_name}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
