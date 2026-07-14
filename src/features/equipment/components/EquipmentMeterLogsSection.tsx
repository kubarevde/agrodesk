import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEquipmentMeterLogs } from '../hooks'
import { formatMeterDate, type MeterLogResponse } from '../types'

type EquipmentMeterLogsSectionProps = {
  equipmentId: string
  canManage: boolean
  onAdd: () => void
}

export function EquipmentMeterLogsSection({
  equipmentId,
  canManage,
  onAdd,
}: EquipmentMeterLogsSectionProps) {
  const { data: logs = [], isLoading } = useEquipmentMeterLogs(equipmentId)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Журнал показаний</h2>
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            + Внести показания
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Записей пока нет</p>
      ) : (
        <div className="overflow-x-auto">
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
              {logs.map((log: MeterLogResponse) => (
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
      )}
    </section>
  )
}
