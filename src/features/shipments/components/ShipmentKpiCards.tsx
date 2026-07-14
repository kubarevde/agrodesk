import { Banknote, Truck, Weight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney, formatTonnes } from '@/features/shipments/utils'

interface ShipmentKpiCardsProps {
  totalKg: number
  totalRevenue: number
  tripsCount: number
  isLoading?: boolean
}

export function ShipmentKpiCards({
  totalKg,
  totalRevenue,
  tripsCount,
  isLoading,
}: ShipmentKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const items = [
    {
      title: 'Всего отгружено',
      value: formatTonnes(totalKg),
      icon: Weight,
    },
    {
      title: 'Выручка',
      value: formatMoney(totalRevenue),
      icon: Banknote,
    },
    {
      title: 'Кол-во рейсов',
      value: String(tripsCount),
      icon: Truck,
    },
  ] as const

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ title, value, icon: Icon }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
