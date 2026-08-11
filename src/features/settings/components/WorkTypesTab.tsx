import { Pencil, Plus, UserCheck, UserX, Wrench } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WorkType } from '@/types'
import { useSettingsWorkTypes, useUpdateWorkType } from '@/features/settings/hooks'
import { WorkTypeFormModal } from './WorkTypeFormModal'
import { ActiveStatusBadge } from './StatusControls'

export function WorkTypesTab() {
  const { data: workTypes = [], isLoading } = useSettingsWorkTypes()
  const updateWorkType = useUpdateWorkType()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkType | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          Добавить тип работ
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} columns={3} />
      ) : workTypes.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Типов работ пока нет"
          action={{
            label: 'Добавить тип работ',
            onClick: () => {
              setEditing(null)
              setFormOpen(true)
            },
          }}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Полевая</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category || '—'}</TableCell>
                    <TableCell>{item.isFieldWork ? 'Да' : 'Нет'}</TableCell>
                    <TableCell>
                      <ActiveStatusBadge isActive={item.isActive} />
                    </TableCell>
                    <TableCell>
                      <CardActionsMenu
                        title={item.name}
                        ariaLabel="Действия"
                        actions={[
                          {
                            id: 'edit',
                            label: 'Редактировать',
                            icon: Pencil,
                            onSelect: () => {
                              setEditing(item)
                              setFormOpen(true)
                            },
                          },
                          {
                            id: 'toggle',
                            label: item.isActive ? 'Деактивировать' : 'Активировать',
                            icon: item.isActive ? UserX : UserCheck,
                            onSelect: () =>
                              updateWorkType.mutate({ id: item.id, isActive: !item.isActive }),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {workTypes.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.category || 'Без категории'}
                      {' · '}
                      {item.isFieldWork ? 'Полевая' : 'Не полевая'}
                    </p>
                    <div className="mt-2">
                      <ActiveStatusBadge isActive={item.isActive} />
                    </div>
                  </div>
                  <CardActionsMenu
                    title={item.name}
                    ariaLabel="Действия"
                    actions={[
                      {
                        id: 'edit',
                        label: 'Редактировать',
                        icon: Pencil,
                        onSelect: () => {
                          setEditing(item)
                          setFormOpen(true)
                        },
                      },
                      {
                        id: 'toggle',
                        label: item.isActive ? 'Деактивировать' : 'Активировать',
                        icon: item.isActive ? UserX : UserCheck,
                        onSelect: () =>
                          updateWorkType.mutate({ id: item.id, isActive: !item.isActive }),
                      },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <WorkTypeFormModal
        key={editing?.id ?? 'create'}
        open={formOpen}
        workType={editing}
        nameSuggestions={workTypes.map((row) => row.name)}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
