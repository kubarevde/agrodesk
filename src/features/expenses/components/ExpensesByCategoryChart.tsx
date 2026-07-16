import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  formatMoney,
  getCategoryColor,
  getCategoryLabel,
} from '@/features/expenses/utils'

interface CategoryChartPoint {
  category: string
  amount: number
  percent: number
}

interface ExpensesByCategoryChartProps {
  data: CategoryChartPoint[]
  isLoading?: boolean
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ payload: CategoryChartPoint }>
  labelFn: (category: string) => string
}

function ChartTooltip({ active, payload, labelFn }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{labelFn(point.category)}</p>
      <p className="text-muted-foreground">
        {formatMoney(point.amount)} · {point.percent}%
      </p>
    </div>
  )
}

export function ExpensesByCategoryChart({ data, isLoading }: ExpensesByCategoryChartProps) {
  const { data: categories = [] } = useDictionary('expense_category', { activeOnly: false })
  const labelFn = (category: string) => getCategoryLabel(category, categories)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-[260px] w-[260px] rounded-full" />
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
      <CardContent>
        {data.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            Нет данных за выбранный период
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ payload }) => labelFn((payload as CategoryChartPoint).category)}
              >
                {data.map((entry) => (
                  <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip labelFn={labelFn} />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
