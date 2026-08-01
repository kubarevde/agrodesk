import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SuperAdminStats } from '@/features/superadmin/types'

type MetricRow = { label: string; value: number }

function MetricList({ rows }: { rows: MetricRow[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-medium tabular-nums text-foreground">{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

type PlatformOverviewPanelsProps = {
  stats: SuperAdminStats
}

export function PlatformOverviewPanels({ stats }: PlatformOverviewPanelsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform health</CardTitle>
          <p className="text-xs text-muted-foreground">Организации и тарифы</p>
        </CardHeader>
        <CardContent>
          <MetricList
            rows={[
              { label: 'Активных', value: stats.activeOrgs },
              { label: 'Неактивных', value: stats.inactiveOrgs },
              { label: 'Trial', value: stats.trialOrgs },
              { label: 'Basic', value: stats.basicOrgs },
              { label: 'Pro', value: stats.proOrgs },
              { label: 'Trial истекает ≤7д', value: stats.trialsExpiringSoon },
              { label: 'Trial просрочен', value: stats.trialsExpiredActive },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage</CardTitle>
          <p className="text-xs text-muted-foreground">Пользователи и смены (core tenant)</p>
        </CardHeader>
        <CardContent>
          <MetricList
            rows={[
              { label: 'Сотрудников всего', value: stats.totalEmployees },
              { label: 'Активных сотрудников', value: stats.activeEmployees },
              { label: 'Смен сегодня', value: stats.totalShiftsToday },
              { label: 'Открытых смен сегодня', value: stats.openShiftsToday },
              { label: 'Открытых смен всего', value: stats.openShifts },
              { label: 'Тикетов всего', value: stats.supportTotal },
              { label: 'Непрочитанных', value: stats.supportUnread },
              { label: 'Новых / в работе', value: stats.supportNew + stats.supportInProgress },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feature adoption</CardTitle>
          <p className="text-xs text-muted-foreground">
            Platform flags и связи. Не holding overview.
          </p>
        </CardHeader>
        <CardContent>
          <MetricList
            rows={[
              { label: 'marketplace_enabled', value: stats.marketplaceOrgs },
              { label: 'Головных с links', value: stats.hierarchyHeads },
              { label: 'Связей head→child', value: stats.hierarchyLinks },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Marketplace</CardTitle>
          <p className="text-xs text-muted-foreground">Отдельно от core usage</p>
        </CardHeader>
        <CardContent>
          <MetricList
            rows={[
              { label: 'Org с флагом', value: stats.marketplaceOrgs },
              { label: 'На модерации', value: stats.listingsPendingReview },
              { label: 'Опубликовано', value: stats.listingsPublished },
              { label: 'Новых заказов', value: stats.ordersNew },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
