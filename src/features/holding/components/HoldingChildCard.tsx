import { Building2, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHoldingSwitch } from '@/features/holding/hooks'
import type { HoldingChildSummary } from '@/features/holding/types'

type HoldingChildCardProps = {
  child: HoldingChildSummary
  canSwitch: boolean
}

function formatTonnes(kg: number): string {
  return `${(kg / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} т`
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`
}

export function HoldingChildCard({ child, canSwitch }: HoldingChildCardProps) {
  const switchMut = useHoldingSwitch()
  const busy = switchMut.isPending

  const onOpen = () => {
    if (!canSwitch || !child.isActive) return
    switchMut.mutate({ orgId: child.orgId, name: child.name, slug: child.slug })
  }

  return (
    <Card data-testid="holding-child-card">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 shrink-0 text-primary" />
            <span className="truncate">{child.name}</span>
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {child.slug}
            {!child.isActive ? ' · неактивна' : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canSwitch || !child.isActive || busy}
          title={
            !canSwitch
              ? 'Нет права holding.switch'
              : !child.isActive
                ? 'Организация неактивна'
                : 'Открыть КФХ в отдельном контексте'
          }
          onClick={onOpen}
          data-testid="holding-open-child"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : canSwitch ? null : (
            <Lock className="size-3.5" />
          )}
          Открыть КФХ
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Metric label="Сотрудники" value={String(child.employeesCount)} />
          <Metric label="На смене" value={String(child.activeShiftsCount)} />
          <Metric label="Смены / мес." value={String(child.monthShiftsCount)} />
          <Metric label="Часы / мес." value={child.monthHours.toFixed(1)} />
          <Metric label="Урожай / мес." value={formatTonnes(child.monthShipmentsKg)} />
          <Metric label="Выручка / мес." value={formatMoney(child.monthShipmentsSum)} />
          <Metric label="Затраты / мес." value={formatMoney(child.monthExpensesSum)} />
          <Metric label="ТМЦ критич." value={String(child.criticalInventoryCount)} />
          <Metric label="Заявки" value={String(child.shipmentRequestsActive)} />
        </ul>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-md bg-muted/40 px-2 py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </li>
  )
}
