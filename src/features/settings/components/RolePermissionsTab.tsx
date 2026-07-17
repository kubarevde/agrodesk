import { useEffect, useState } from 'react'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  useRolePermissions,
  useUpdateRolePermissions,
} from '@/features/settings/permissionsHooks'
import { SECTION_DESCRIPTIONS } from '@/features/help/modules'

const ROLES: Array<{ key: 'manager' | 'employee'; label: string }> = [
  { key: 'manager', label: 'Менеджер' },
  { key: 'employee', label: 'Сотрудник' },
]

export function RolePermissionsTab() {
  const { data: user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const { data, isLoading } = useRolePermissions(isAdmin)
  const update = useUpdateRolePermissions()
  const [draft, setDraft] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (data?.permissions) setDraft(data.permissions)
  }, [data?.permissions])

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Настраивать доступы может только администратор организации.
      </p>
    )
  }

  if (isLoading || !data) return <PageSkeleton />

  const toggle = (role: 'manager' | 'employee', sectionKey: string) => {
    setDraft((prev) => {
      const current = new Set(prev[role] ?? [])
      if (current.has(sectionKey)) current.delete(sectionKey)
      else current.add(sectionKey)
      return { ...prev, [role]: [...current] }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Администратор всегда видит все разделы. Здесь настраивается, какие разделы доступны
        менеджерам и сотрудникам.
      </p>

      {ROLES.map((role) => (
        <section key={role.key} className="space-y-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">{role.label}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.sections.map((section) => {
              const checked = (draft[role.key] ?? []).includes(section.key)
              return (
                <li key={`${role.key}-${section.key}`}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-2 text-sm hover:bg-muted/30">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      onChange={() => toggle(role.key, section.key)}
                    />
                    <span className="flex flex-col">
                      <span>{section.label}</span>
                      {SECTION_DESCRIPTIONS[section.key] ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {SECTION_DESCRIPTIONS[section.key]}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <Button
        type="button"
        disabled={update.isPending}
        onClick={() => void update.mutateAsync(draft)}
      >
        Сохранить права доступа
      </Button>
    </div>
  )
}
