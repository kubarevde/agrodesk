import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  CategoryChartTooltip,
  CategoryShareLegend,
} from '@/features/expenses/components/CategoryShareLegend'
import {
  OTHER_CATEGORY_KEY,
  aggregateCategoryChartData,
  getCategoryColor,
  getCategoryLabel,
  type CategorySharePoint,
} from '@/features/expenses/utils'
import { cn } from '@/lib/utils'

interface ExpensesByCategoryChartProps {
  data: CategorySharePoint[]
  isLoading?: boolean
}

function chartHeightClass(count: number): string {
  if (count <= 3) return 'h-44'
  if (count <= 5) return 'h-56'
  return 'h-72'
}

export function ExpensesByCategoryChart({ data, isLoading }: ExpensesByCategoryChartProps) {
  const { data: categories = [] } = useDictionary('expense_category', { activeOnly: false })
  const [otherOpen, setOtherOpen] = useState(false)
  const aggregated = useMemo(() => aggregateCategoryChartData(data), [data])

  const chartRows = useMemo(
    () =>
      aggregated.segments.map((segment) => ({
        ...segment,
        name:
          segment.category === OTHER_CATEGORY_KEY
            ? 'Прочее'
            : getCategoryLabel(segment.category, categories),
        fill: getCategoryColor(segment.category),
      })),
    [aggregated.segments, categories],
  )

  const labelFn = (category: string) =>
    category === OTHER_CATEGORY_KEY
      ? 'Прочее'
      : getCategoryLabel(category, categories)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-52 w-full rounded-md" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Доли по категориям
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Нет данных за выбранный период
          </p>
        ) : (
          <>
            <div className={cn('w-full min-h-44', chartHeightClass(chartRows.length))}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    tickFormatter={(v: string) =>
                      v.length > 14 ? `${v.slice(0, 13)}…` : v
                    }
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
                    content={<CategoryChartTooltip />}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[0, 4, 4, 0]}
                    barSize={22}
                    maxBarSize={28}
                    onClick={(entry) => {
                      const cat =
                        entry && typeof entry === 'object' && 'category' in entry
                          ? String((entry as { category?: string }).category ?? '')
                          : ''
                      if (cat === OTHER_CATEGORY_KEY) setOtherOpen(true)
                    }}
                  >
                    {chartRows.map((row) => (
                      <Cell
                        key={row.category}
                        fill={row.fill}
                        cursor={row.isOther ? 'pointer' : 'default'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <CategoryShareLegend
              rows={chartRows}
              otherDetails={aggregated.otherDetails}
              otherOpen={otherOpen}
              onOtherOpenChange={setOtherOpen}
              labelFn={labelFn}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
