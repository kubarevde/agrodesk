import type { AuditLogEntry } from '../types'
import { AuditLogRow } from './AuditLogRow'

type AuditLogListProps = {
  items: AuditLogEntry[]
  isMobile: boolean
  onDetails: (entry: AuditLogEntry) => void
}

export function AuditLogList({ items, isMobile, onDetails }: AuditLogListProps) {
  if (isMobile) {
    return (
      <div className="space-y-2">
        {items.map((entry) => (
          <AuditLogRow key={entry.id} entry={entry} compact onDetails={onDetails} />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-left">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Когда</th>
            <th className="px-3 py-2 font-medium">Кто</th>
            <th className="px-3 py-2 font-medium">Раздел</th>
            <th className="px-3 py-2 font-medium">Действие</th>
            <th className="px-3 py-2 font-medium">Описание</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => (
            <AuditLogRow key={entry.id} entry={entry} onDetails={onDetails} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
