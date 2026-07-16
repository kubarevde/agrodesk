import { DollarSign, FileText, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDictionary } from '@/features/dictionaries/hooks'
import { formatMoney, getCategoryLabel } from '@/features/expenses/utils'

interface ExpenseKpiCardsProps {
  totalAmount: number
  largestCategory: { category: string; amount: number } | null
  recordsCount: number
  isLoading?: boolean
}

export function ExpenseKpiCards({
  totalAmount,
  largestCategory,
  recordsCount,
  isLoading,
}: ExpenseKpiCardsProps) {
  const { data: categories = [] } = useDictionary('expense_category', { activeOnly: false })

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

  const largestLabel = largestCategory
    ? `${getCategoryLabel(largestCategory.category, categories)}: ${formatMoney(largestCategory.amount)}`
    : '—'

  const items = [
    { title: 'Всего затрат', value: formatMoney(totalAmount), icon: DollarSign },
    { title: 'Крупнейшая статья', value: largestLabel, icon: Layers },
    { title: 'Записей', value: String(recordsCount), icon: FileText },
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
