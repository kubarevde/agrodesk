import { Loader2, Unlink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { superadminApiErrorMessage } from '@/features/superadmin/api'
import {
  useAttachOrgChild,
  useDetachOrgChild,
  useOrgChildren,
  useOrgChildrenAvailable,
} from '@/features/superadmin/hooks'
import type { OrgHierarchyChild } from '@/features/superadmin/types'

type OrgChildrenSectionProps = {
  headOrgId: string
  enabled: boolean
  /** When nested in OrgHierarchySection — skip duplicate outer card chrome. */
  embedded?: boolean
}

export function OrgChildrenSection({
  headOrgId,
  enabled,
  embedded = false,
}: OrgChildrenSectionProps) {
  const childrenQuery = useOrgChildren(headOrgId, enabled)
  const availableQuery = useOrgChildrenAvailable(headOrgId, enabled)
  const attach = useAttachOrgChild(headOrgId)
  const detach = useDetachOrgChild(headOrgId)
  const [selectedChildId, setSelectedChildId] = useState<string>('')

  const candidates = availableQuery.data ?? []
  const selectItems = candidates.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.slug})`,
  }))

  const onAttach = async () => {
    if (!selectedChildId) return
    try {
      await attach.mutateAsync(selectedChildId)
      toast.success('КФХ привязано')
      setSelectedChildId('')
    } catch (error) {
      toast.error(superadminApiErrorMessage(error, 'Не удалось привязать КФХ'))
    }
  }

  const onDetach = async (child: OrgHierarchyChild) => {
    if (!window.confirm(`Отвязать «${child.childName}» от этой головной организации?`)) {
      return
    }
    try {
      await detach.mutateAsync(child.childOrgId)
      toast.success('КФХ отвязано')
    } catch (error) {
      toast.error(superadminApiErrorMessage(error, 'Не удалось отвязать КФХ'))
    }
  }

  const busy = attach.isPending || detach.isPending

  const body = (
    <>
      {!embedded ? (
        <div>
          <p className="text-sm font-medium">Дочерние КФХ</p>
          <p className="text-xs text-muted-foreground">
            Только superadmin. Настройки и маркетплейс детей не меняются.
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium">Дочерние КФХ</p>
      )}

      {childrenQuery.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !childrenQuery.data?.length ? (
        <p className="text-sm text-muted-foreground">Пока нет привязанных организаций</p>
      ) : (
        <ul className="space-y-2">
          {childrenQuery.data.map((child) => (
            <li
              key={child.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{child.childName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {child.childSlug}
                  {!child.childIsActive ? ' · неактивна' : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Отвязать ${child.childName}`}
                disabled={busy}
                onClick={() => void onDetach(child)}
              >
                {detach.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Unlink className="size-4 text-destructive" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Label>Привязать организацию</Label>
        {availableQuery.isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет доступных организаций</p>
        ) : (
          <div className="flex gap-2">
            <Select
              value={selectedChildId || undefined}
              onValueChange={(value) => setSelectedChildId(value ?? '')}
              items={selectItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите КФХ" />
              </SelectTrigger>
              <SelectContent>
                {selectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedChildId || busy}
              onClick={() => void onAttach()}
            >
              {attach.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Привязать'}
            </Button>
          </div>
        )}
      </div>
    </>
  )

  if (embedded) {
    return <div className="space-y-3">{body}</div>
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">{body}</div>
  )
}
