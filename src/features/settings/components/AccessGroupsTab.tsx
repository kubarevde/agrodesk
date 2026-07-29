import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { useEmployees } from '@/features/employees/hooks'
import {
  AccessGroupFormDialog,
  type Draft,
} from '@/features/settings/components/AccessGroupFormDialog'
import {
  useAccessGroups,
  useCreateAccessGroup,
  useDeleteAccessGroup,
  useUpdateAccessGroup,
  type AccessGroup,
} from '@/features/settings/accessGroupHooks'

const emptyDraft = (): Draft => ({
  name: '',
  sections: [],
  actions: [],
  memberIds: [],
})

export function AccessGroupsTab() {
  const { data: user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const { data, isLoading } = useAccessGroups(isAdmin)
  const { data: employees = [] } = useEmployees({ enabled: isAdmin })
  const createGroup = useCreateAccessGroup()
  const updateGroup = useUpdateAccessGroup()
  const deleteGroup = useDeleteAccessGroup()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AccessGroup | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  const assignableEmployees = useMemo(
    () => employees.filter((e) => e.role !== 'admin' && e.isActive !== false),
    [employees],
  )

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Группы доступа настраивает только администратор.
      </p>
    )
  }

  if (isLoading || !data) return <PageSkeleton />

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft())
    setDialogOpen(true)
  }

  const openEdit = (group: AccessGroup) => {
    setEditing(group)
    setDraft({
      name: group.name,
      sections: [...group.sections],
      actions: [...group.actions],
      memberIds: group.members.map((m) => m.id),
    })
    setDialogOpen(true)
  }

  const save = async () => {
    const payload = {
      name: draft.name.trim(),
      sections: draft.sections,
      actions: draft.actions,
      member_ids: draft.memberIds,
    }
    if (!payload.name) return
    if (editing) await updateGroup.mutateAsync({ id: editing.id, ...payload })
    else await createGroup.mutateAsync(payload)
    setDialogOpen(false)
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm text-muted-foreground break-words">
          Группа полностью заменяет права роли для назначенных сотрудников. Без группы
          действуют чекбоксы роли ниже. Предустановка «Снабженец» — закупки + склад.
        </p>
        <Button type="button" onClick={openCreate} className="h-11 w-full shrink-0 sm:w-auto">
          <Plus className="size-4" />
          Группа
        </Button>
      </div>

      <ul className="space-y-3">
        {data.groups.map((group) => (
          <li
            key={group.id}
            className="min-w-0 rounded-lg border border-border bg-surface p-3 sm:p-4"
          >
            <div className="flex flex-col gap-3">
              <div className="min-w-0 space-y-1">
                <p className="break-words font-medium text-foreground">
                  {group.name}
                  {group.is_system ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      системная
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Разделов: {group.sections.length} · Действий: {group.actions.length} ·
                  Сотрудников: {group.member_count}
                </p>
                <p className="text-xs text-muted-foreground break-words">
                  {group.members.length > 0
                    ? group.members.map((m) => m.full_name).join(', ')
                    : 'Никто не назначен'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-w-11 flex-1 sm:flex-none"
                  onClick={() => openEdit(group)}
                >
                  <Pencil className="size-4" />
                  <span className="ml-1">Изменить</span>
                </Button>
                {!group.is_system ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-w-11 flex-1 border-destructive text-destructive sm:flex-none"
                    onClick={() => {
                      if (window.confirm(`Удалить группу «${group.name}»?`)) {
                        void deleteGroup.mutateAsync(group.id)
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                    <span className="ml-1">Удалить</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <AccessGroupFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        draft={draft}
        setDraft={setDraft}
        sections={data.sections}
        actions={data.actions}
        employees={assignableEmployees}
        saving={createGroup.isPending || updateGroup.isPending}
        onSave={() => void save()}
      />
    </div>
  )
}
