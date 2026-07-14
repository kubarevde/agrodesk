import { MoreHorizontal, Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Location } from '@/types'
import { MapPin } from 'lucide-react'
import { useSettingsLocations, useUpdateLocation } from '@/features/settings/hooks'
import { LocationFormModal } from './LocationFormModal'
import { ActiveStatusBadge } from './StatusControls'

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
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.description || '—'}</TableCell>
                  <TableCell>
                    <ActiveStatusBadge isActive={location.isActive} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                        aria-label="Действия"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(location)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateLocation.mutate({
                              id: location.id,
                              isActive: !location.isActive,
                            })
                          }
                        >
                          {location.isActive ? (
                            <>
                              <UserX className="size-4" />
                              Деактивировать
                            </>
                          ) : (
                            <>
                              <UserCheck className="size-4" />
                              Активировать
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LocationFormModal
        key={editing?.id ?? 'create'}
        open={formOpen}
        location={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
