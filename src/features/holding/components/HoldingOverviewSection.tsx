import { Network } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HoldingChildCard } from '@/features/holding/components/HoldingChildCard'
import {
  useCanSwitchHolding,
  useCanViewHolding,
  useHoldingOverview,
} from '@/features/holding/hooks'
import type { HoldingChildSummary } from '@/features/holding/types'

function formatTonnes(kg: number): string {
  return `${(kg / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} т`
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`
}

function TotalsStrip({
  totals,
  childCount,
}: {
  totals: HoldingChildSummary
  childCount: number
}) {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      data-testid="holding-totals"
    >
      <Total label="КФХ" value={String(childCount)} />
      <Total label="Сотрудники" value={String(totals.employeesCount)} />
      <Total label="На смене" value={String(totals.activeShiftsCount)} />
      <Total label="Смены / мес." value={String(totals.monthShiftsCount)} />
      <Total label="Урожай / мес." value={formatTonnes(totals.monthShipmentsKg)} />
      <Total label="Затраты / мес." value={formatMoney(totals.monthExpensesSum)} />
      <Total label="ТМЦ критич." value={String(totals.criticalInventoryCount)} />
      <Total label="Активные заявки" value={String(totals.shipmentRequestsActive)} />
    </div>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

export function HoldingOverviewSection() {
  const canView = useCanViewHolding()
  const canSwitch = useCanSwitchHolding()
  const { data, isLoading, isError } = useHoldingOverview(canView)

  if (!canView) return null
  // No skeleton: avoids flashing holding chrome for ordinary orgs (admin has the
  // action key but 403 when not a head). Head overview appears when data is ready.
  if (isLoading || isError || data == null) return null

  const children = data.children
  const childCount = children.length

  return (
    <section className="space-y-3" data-testid="holding-overview">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="size-4 text-primary" />
            Обзор дочерних КФХ
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Сводка по связанным хозяйствам. Ниже — дашборд только этой организации.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.totals && childCount > 0 ? (
            <TotalsStrip totals={data.totals} childCount={childCount} />
          ) : null}

          {childCount === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="holding-empty">
              Дочерние КФХ ещё не привязаны. Связи настраивает суперадмин.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {children.map((child) => (
                <HoldingChildCard key={child.orgId} child={child} canSwitch={canSwitch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
