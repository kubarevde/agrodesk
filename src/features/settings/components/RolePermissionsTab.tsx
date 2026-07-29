import { useEffect, useState } from 'react'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  useRolePermissions,
  useUpdateRolePermissions,
} from '@/features/settings/permissionsHooks'
import { SECTION_DESCRIPTIONS } from '@/features/help/modules'
import { EMPLOYEE_LOCKED_SECTIONS } from '@/lib/sectionRegistry'
import { cn } from '@/lib/utils'

const ROLES: Array<{ key: 'manager' | 'employee'; label: string }> = [
  { key: 'manager', label: 'Менеджер' },
  { key: 'employee', label: 'Сотрудник' },
]

/** Only «Моя смена» is non-revocable for employees — do not lock sharing or other sections. */
const LOCKED_EMPLOYEE_SECTIONS = new Set(EMPLOYEE_LOCKED_SECTIONS)

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
    if (role === 'employee' && LOCKED_EMPLOYEE_SECTIONS.has(sectionKey)) return
    setDraft((prev) => {
      const current = new Set(prev[role] ?? [])
      if (current.has(sectionKey)) current.delete(sectionKey)
      else current.add(sectionKey)
      return { ...prev, [role]: [...current] }
    })
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <p className="text-sm text-muted-foreground break-words">
        Администратор всегда видит все разделы. Здесь настраивается, какие разделы доступны
        менеджерам и сотрудникам как ролям (не персонально одному человеку). У сотрудника
        обязателен только пункт «Моя смена» — его нельзя снять. Остальные разделы, включая
        «Шеринг», включаются и выключаются свободно. После сохранения сотрудникам нужно
        обновить страницу или войти заново, чтобы увидеть новые пункты меню.
      </p>

      {ROLES.map((role) => (
        <section
          key={role.key}
          className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-3"
        >
          <h3 className="text-sm font-semibold text-foreground">{role.label}</h3>
          {/* Mobile: stacked cards; sm+: two columns without forcing page h-scroll */}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.sections.map((section) => {
              const locked =
                role.key === 'employee' && LOCKED_EMPLOYEE_SECTIONS.has(section.key)
              const checked =
                locked || (draft[role.key] ?? []).includes(section.key)
              return (
                <li key={`${role.key}-${section.key}`} className="min-w-0">
                  <label
                    className={cn(
                      'flex min-h-11 w-full min-w-0 cursor-pointer items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm',
                      'hover:bg-muted/30',
                      locked && 'cursor-default opacity-90',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 shrink-0 accent-primary"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggle(role.key, section.key)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground break-words">
                        {section.label}
                        {locked ? (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (всегда)
                          </span>
                        ) : null}
                      </span>
                      {SECTION_DESCRIPTIONS[section.key] ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground break-words">
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
        className="h-11 w-full sm:w-auto"
        disabled={update.isPending}
        onClick={() => void update.mutateAsync(draft)}
      >
        Сохранить права доступа
      </Button>
    </div>
  )
}
