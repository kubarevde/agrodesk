import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardWeeklyHours } from '@/types'

interface WeeklyHoursChartProps {
  data: DashboardWeeklyHours[]
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ payload: DashboardWeeklyHours }>
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{point.day}</p>
      <p className="text-muted-foreground">{point.hours} ч</p>
      <p className="text-muted-foreground">{point.shiftsCount} смен</p>
    </div>
  )
}

export function WeeklyHoursChart({ data }: WeeklyHoursChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Часы за последние 7 дней
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              width={32}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="hours"
              stroke="#01696F"
              strokeWidth={2}
              dot={{ r: 4, fill: '#01696F', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#01696F' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function WeeklyHoursChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  )
}
