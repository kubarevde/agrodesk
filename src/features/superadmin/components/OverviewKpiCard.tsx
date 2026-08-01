import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type OverviewKpiCardProps = {
  title: string
  value: number
  hint?: string
}

export function OverviewKpiCard({ title, value, hint }: OverviewKpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
