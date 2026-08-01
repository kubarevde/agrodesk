import { AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SuperAdminAttentionItem } from '@/features/superadmin/types'

type PlatformAttentionListProps = {
  items: SuperAdminAttentionItem[]
}

export function PlatformAttentionList({ items }: PlatformAttentionListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Сейчас нет сигналов, требующих внимания</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Attention</CardTitle>
        <p className="text-xs text-muted-foreground">Только по реальным счётчикам, без трендов</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.code}
              className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
            >
              {item.severity === 'warning' ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
