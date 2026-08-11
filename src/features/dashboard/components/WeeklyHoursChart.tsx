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
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-foreground">{point.day}</p>
      <p className="text-muted-foreground">{point.hours} ч</p>
      <p className="text-muted-foreground">{point.shiftsCount} смен</p>
    </div>
  )
}

export function WeeklyHoursChart({ data }: WeeklyHoursChartProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-3 pb-1.5">
        <CardTitle className="text-sm font-semibold text-foreground">Часы по дням</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="hours"
              stroke="#01696F"
              strokeWidth={2}
              dot={{ r: 3, fill: '#01696F', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#01696F' }}
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
      <CardHeader className="px-4 py-3 pb-1.5">
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <Skeleton className="h-[180px] w-full" />
      </CardContent>
    </Card>
  )
}
