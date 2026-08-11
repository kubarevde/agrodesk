import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AccessGroup } from '@/features/settings/accessGroupHooks'
import { ACTION_UI_GROUPS, syncActionsWithSectionToggle } from '@/lib/permissionActions'
import type { Employee } from '@/types'

type Draft = {
  name: string
  sections: string[]
  actions: string[]
  memberIds: string[]
}

type CatalogItem = { key: string; label: string }

interface AccessGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: AccessGroup | null
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
  sections: CatalogItem[]
  actions: CatalogItem[]
  employees: Employee[]
  saving: boolean
  onSave: () => void
}

function toggleInList(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((item) => item !== key) : [...list, key]
}

export function AccessGroupFormDialog({
  open,
  onOpenChange,
  editing,
  draft,
  setDraft,
  sections,
  actions,
  employees,
  saving,
  onSave,
}: AccessGroupFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Группа «${editing.name}»` : 'Новая группа доступа'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Название</Label>
            <Input
              id="group-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            {editing?.is_system ? (
              <p className="text-xs text-muted-foreground">
                Системная предустановка: можно изменить отображаемое название. Код группы (
                {editing.code ?? '—'}) и права не меняются.
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Разделы</legend>
            <p className="text-xs text-muted-foreground">
              При включении раздела добавляются базовые действия (свои смены, операции ТМЦ,
              создание закупок). Права «для других» и управление позициями — только вручную.
            </p>
            <ul className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
              {sections.map((section) => (
                <li key={section.key}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={draft.sections.includes(section.key)}
                      onChange={() =>
                        setDraft((d) => {
                          const enabled = !d.sections.includes(section.key)
                          const synced = syncActionsWithSectionToggle(
                            d.sections,
                            d.actions,
                            section.key,
                            enabled,
                          )
                          return { ...d, ...synced }
                        })
                      }
                    />
                    <span className="truncate">{section.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Действия</legend>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {ACTION_UI_GROUPS.map((group) => {
                const groupActions = group.actions
                  .map((key) => actions.find((a) => a.key === key))
                  .filter((item): item is CatalogItem => Boolean(item))
                if (groupActions.length === 0) return null
                return (
                  <div key={group.id} className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <ul className="grid gap-1">
                      {groupActions.map((action) => (
                        <li key={action.key}>
                          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-2 text-sm">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={draft.actions.includes(action.key)}
                              onChange={() =>
                                setDraft((d) => ({
                                  ...d,
                                  actions: toggleInList(d.actions, action.key),
                                }))
                              }
                            />
                            <span className="min-w-0 flex-1 break-words">{action.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Сотрудники</legend>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {employees.map((emp) => (
                <li key={emp.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={draft.memberIds.includes(emp.id)}
                      onChange={() =>
                        setDraft((d) => ({
                          ...d,
                          memberIds: toggleInList(d.memberIds, emp.id),
                        }))
                      }
                    />
                    <span className="truncate">
                      {emp.employeeName}{' '}
                      <span className="text-muted-foreground">({emp.employeeCode})</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { Draft }
