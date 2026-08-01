import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HoldingChildListItem } from '@/features/holding/types'
import { getHoldingSupport } from '@/features/reports/holdingSupport'

export type ReportScopeKind = 'current' | 'child' | 'group'

interface HoldingReportScopeFieldsProps {
  reportId: string
  children: HoldingChildListItem[]
  scope: ReportScopeKind
  childOrgId: string
  onScopeChange: (scope: ReportScopeKind) => void
  onChildOrgIdChange: (orgId: string) => void
}

export function HoldingReportScopeFields({
  reportId,
  children,
  scope,
  childOrgId,
  onScopeChange,
  onChildOrgIdChange,
}: HoldingReportScopeFieldsProps) {
  const support = getHoldingSupport(reportId)
  const allowsGroup = support?.modes.includes('group') ?? false
  const activeChildren = children.filter((c) => c.isActive)

  const scopeItems = [
    { value: 'current', label: 'Текущая организация' },
    { value: 'child', label: 'Одна КФХ' },
    ...(allowsGroup ? [{ value: 'group', label: 'Сводка по всем КФХ' }] : []),
  ]

  const scopeLabel =
    scope === 'current'
      ? 'Область: текущая организация (как обычный отчёт)'
      : scope === 'group'
        ? 'Область: сводка по связанным КФХ (holding)'
        : 'Область: одна дочерняя КФХ (holding)'

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="space-y-2">
        <Label>Область отчёта</Label>
        <Select
          value={scope}
          onValueChange={(value) => onScopeChange((value ?? 'current') as ReportScopeKind)}
          items={scopeItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Область" />
          </SelectTrigger>
          <SelectContent>
            {scopeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{scopeLabel}</p>
        {!allowsGroup && support?.groupUnsupportedReason ? (
          <p className="text-xs text-muted-foreground">{support.groupUnsupportedReason}</p>
        ) : null}
      </div>

      {scope === 'child' ? (
        <div className="space-y-2">
          <Label>КФХ</Label>
          <Select
            value={childOrgId || undefined}
            onValueChange={(value) => onChildOrgIdChange(value ?? '')}
            items={activeChildren.map((c) => ({ value: c.orgId, label: c.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите КФХ" />
            </SelectTrigger>
            <SelectContent>
              {activeChildren.map((c) => (
                <SelectItem key={c.orgId} value={c.orgId}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  )
}
