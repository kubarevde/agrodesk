import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicOrgs } from '@/features/auth/hooks'
import type { SelectedOrg } from '@/features/auth/selectedOrg'
import { cn } from '@/lib/utils'

type OrgSelectorProps = {
  value: SelectedOrg | null
  onChange: (org: SelectedOrg) => void
  onContinue: () => void
}

export function OrgSelector({ value, onChange, onContinue }: OrgSelectorProps) {
  const orgsQuery = usePublicOrgs()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const list = orgsQuery.data ?? []
    const q = filter.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (org) =>
        org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q),
    )
  }, [filter, orgsQuery.data])

  if (orgsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  if (!orgsQuery.data?.length) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">Нет доступных организаций</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Организация</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            type="button"
            className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {value ? value.name : 'Выберите организацию'}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Поиск по названию"
              className="mb-2"
            />
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Ничего не найдено</p>
              ) : (
                filtered.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onChange(org)
                      setOpen(false)
                      setFilter('')
                    }}
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{org.name}</span>
                      <span className="ml-2 text-muted-foreground">{org.slug}</span>
                    </span>
                    {value?.id === org.id ? (
                      <Check className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Button
        type="button"
        className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
        disabled={!value}
        onClick={onContinue}
      >
        Продолжить
      </Button>
      {orgsQuery.isFetching ? (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Обновление списка
        </p>
      ) : null}
    </div>
  )
}
