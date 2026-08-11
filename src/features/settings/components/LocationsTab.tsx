import { MapPin, Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import type { CardActionItem } from '@/components/shared/CardActionsMenu'
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
import type { Location } from '@/types'
import { useSettingsLocations, useUpdateLocation } from '@/features/settings/hooks'
import { LocationFormModal } from './LocationFormModal'
import { ActiveStatusBadge } from './StatusControls'

function locationActions(
  location: Location,
  onEdit: () => void,
  onToggle: () => void,
): CardActionItem[] {
  const actions: CardActionItem[] = [
    {
      id: 'edit',
      label: 'Редактировать',
      icon: Pencil,
      onSelect: onEdit,
    },
  ]
  if (!location.isSystem) {
    actions.push({
      id: 'toggle',
      label: location.isActive ? 'Деактивировать' : 'Активировать',
      icon: location.isActive ? UserX : UserCheck,
      onSelect: onToggle,
    })
  }
  return actions
}

function hasGeo(location: Location): boolean {
  return location.latitude != null && location.longitude != null
}

export function LocationsTab() {
  const { data: locations = [], isLoading } = useSettingsLocations()
  const updateLocation = useUpdateLocation()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)

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
          Добавить объект
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} columns={4} />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Объектов пока нет"
          action={{
            label: 'Добавить объект',
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
                  <TableHead>Описание</TableHead>
                  <TableHead>Карта</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {location.name}
                        {location.isSystem ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            Системный
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>{location.description || '—'}</TableCell>
                    <TableCell>
                      {hasGeo(location) ? (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" />
                          Есть
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <ActiveStatusBadge isActive={location.isActive} />
                    </TableCell>
                    <TableCell>
                      <CardActionsMenu
                        title={location.name}
                        ariaLabel="Действия"
                        actions={locationActions(
                          location,
                          () => {
                            setEditing(location)
                            setFormOpen(true)
                          },
                          () =>
                            updateLocation.mutate({
                              id: location.id,
                              isActive: !location.isActive,
                            }),
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {locations.map((location) => (
              <li
                key={location.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {location.name}
                      {location.isSystem ? (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                          Системный
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {location.description || '—'}
                    </p>
                    {hasGeo(location) ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" />
                        На карте
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <ActiveStatusBadge isActive={location.isActive} />
                    </div>
                  </div>
                  <CardActionsMenu
                    title={location.name}
                    ariaLabel="Действия"
                    actions={locationActions(
                      location,
                      () => {
                        setEditing(location)
                        setFormOpen(true)
                      },
                      () =>
                        updateLocation.mutate({
                          id: location.id,
                          isActive: !location.isActive,
                        }),
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <LocationFormModal
        key={editing?.id ?? 'create'}
        open={formOpen}
        location={editing}
        nameSuggestions={locations.map((row) => row.name)}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
