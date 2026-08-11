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
import {
  CategoryChartTooltip,
  CategoryShareLegend,
} from '@/features/expenses/components/CategoryShareLegend'
import {
  OTHER_CATEGORY_KEY,
  aggregateCategoryChartData,
  type CategorySharePoint,
} from '@/features/expenses/utils'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  getIncomeCategoryColor,
  getIncomeCategoryLabel,
  INCOME_SOURCE_LABELS,
} from '../incomeUtils'
import { cn } from '@/lib/utils'
import type { IncomeLedgerSource } from '@/types'

interface IncomeBySourceChartProps {
  data: CategorySharePoint[]
  isLoading?: boolean
}

function chartHeightClass(count: number): string {
  if (count <= 3) return 'h-44'
  if (count <= 5) return 'h-56'
  return 'h-72'
}

export function IncomeBySourceChart({ data, isLoading }: IncomeBySourceChartProps) {
  const { data: categories = [] } = useDictionary('income_category', { activeOnly: false })
  const [otherOpen, setOtherOpen] = useState(false)
  const aggregated = useMemo(() => aggregateCategoryChartData(data), [data])

  const labelFn = (category: string) => {
    if (category === OTHER_CATEGORY_KEY) return 'Прочее'
    return (
      INCOME_SOURCE_LABELS[category as IncomeLedgerSource] ??
      getIncomeCategoryLabel(category, categories)
    )
  }

  const chartRows = useMemo(
    () =>
      aggregated.segments.map((segment) => ({
        ...segment,
        name: labelFn(segment.category),
        fill: getIncomeCategoryColor(segment.category),
      })),
    // labelFn depends on categories; recreate when segments or dict change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggregated.segments, categories],
  )

  if (isLoading) {
    return (
      <Card data-testid="income-chart">
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
    <Card data-testid="income-chart">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Доходы по источникам
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
