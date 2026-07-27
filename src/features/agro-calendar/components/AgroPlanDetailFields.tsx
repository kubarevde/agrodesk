import { Badge } from '@/components/ui/badge'
import { humanLabel, joinLabels } from '@/lib/display'
import type { AgroPlan } from '../types'
import { displayFromIsoDate, isCalendarFact, planFieldsLabel } from '../utils'

export function AgroPlanDetailFields({ plan }: { plan: AgroPlan }) {
  const fact = isCalendarFact(plan)
  const resources = joinLabels([plan.equipmentName, plan.implementName])

  return (
    <div className="space-y-3 px-4 pb-4 text-sm">
      <Row label="Поле" value={planFieldsLabel(plan, 'Поле не указано')} />
      {!fact && plan.fieldNames.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {plan.fieldNames.map((name) => (
            <Badge key={name} variant="outline" className="font-normal">
              {humanLabel(name, 'Поле')}
            </Badge>
          ))}
        </div>
      ) : null}
      <Row
        label="Дата"
        value={
          !fact && plan.plannedEndDate
            ? `${displayFromIsoDate(plan.plannedDate)} — ${displayFromIsoDate(plan.plannedEndDate)}`
            : displayFromIsoDate(plan.plannedDate)
        }
      />
      <Row label="Сотрудник" value={humanLabel(plan.employeeName, '—')} />
      <Row label="Техника" value={humanLabel(plan.equipmentName, '—')} />
      <Row label="Приспособление" value={humanLabel(plan.implementName, '—')} />
      {!fact && plan.notes ? <Row label="Комментарий" value={plan.notes} /> : null}
      {plan.actualShiftId ? (
        <Row
          label="Связь со сменой"
          value={fact ? 'Факт по закрытой смене' : 'Выполнено по смене'}
        />
      ) : null}
      {plan.closedByName ? (
        <Row
          label="Закрыл"
          value={`${plan.closedByName}${plan.closeNote ? ` · ${plan.closeNote}` : ''}`}
        />
      ) : null}
      {!fact && resources ? <Row label="Ресурсы" value={resources} /> : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
