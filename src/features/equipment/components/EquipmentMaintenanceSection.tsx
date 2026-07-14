import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useEquipmentMaintenance } from '../hooks'
import { formatMeterDate, type MaintenanceResponse } from '../types'

type EquipmentMaintenanceSectionProps = {
  equipmentId: string
  canManage: boolean
  onAdd: () => void
}

export function EquipmentMaintenanceSection({
  equipmentId,
  canManage,
  onAdd,
}: EquipmentMaintenanceSectionProps) {
  const { data: records = [], isLoading } = useEquipmentMaintenance(equipmentId)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">История ТО</h2>
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            + Записать ТО
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground">История ТО пуста</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-4">
          {records.map((record: MaintenanceResponse) => (
            <li key={record.id} className="space-y-1">
              <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
              <p className="text-sm font-medium text-foreground">
                {formatMeterDate(String(record.date))} · {record.type}
              </p>
              <p className="text-sm text-muted-foreground">
                При {record.meter_at ?? '—'} {record.meter_label}
                {record.cost != null ? ` · ${record.cost.toLocaleString('ru-RU')} ₽` : ''}
              </p>
              {record.expense_id ? (
                <Link
                  to="/expenses"
                  className="text-sm text-primary hover:underline"
                >
                  Связанная затрата
                </Link>
              ) : null}
              {record.description ? (
                <p className="text-sm text-muted-foreground">{record.description}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
