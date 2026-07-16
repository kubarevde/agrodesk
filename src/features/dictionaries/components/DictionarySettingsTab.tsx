import { MoreHorizontal, Pencil, Plus, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ActiveStatusBadge } from '@/features/settings/components/StatusControls'
import {
  dictionaryTypeLabel,
  useCreateDictionaryItem,
  useDictionary,
  useUpdateDictionaryItem,
  type DictionaryItem,
  type DictionaryType,
} from '../hooks'

type DictionarySettingsTabProps = {
  type: DictionaryType
}

export function DictionarySettingsTab({ type }: DictionarySettingsTabProps) {
  const { data: items = [], isLoading } = useDictionary(type, { activeOnly: false })
  const createItem = useCreateDictionaryItem(type)
  const updateItem = useUpdateDictionaryItem(type)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DictionaryItem | null>(null)
  const [name, setName] = useState('')

  const title = dictionaryTypeLabel(type)

  const openCreate = () => {
    setEditing(null)
    setName('')
    setFormOpen(true)
  }

  const openEdit = (item: DictionaryItem) => {
    setEditing(item)
    setName(item.name)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          Добавить
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} columns={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpen} title={`Справочник «${title}» пуст`} action={{ label: 'Добавить', onClick: openCreate }} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <ActiveStatusBadge isActive={item.is_active} />
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
                        <DropdownMenuItem onClick={() => openEdit(item)}>
                          <Pencil className="size-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateItem.mutate({
                              id: item.id,
                              is_active: !item.is_active,
                            })
                          }
                        >
                          {item.is_active ? 'Деактивировать' : 'Активировать'}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Редактировать — ${title}` : `Добавить — ${title}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dict-name">Название</Label>
            <Input
              id="dict-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: Пшеница"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={!name.trim() || createItem.isPending || updateItem.isPending}
              onClick={() => {
                const trimmed = name.trim()
                if (!trimmed) return
                void (async () => {
                  try {
                    if (editing) {
                      await updateItem.mutateAsync({ id: editing.id, name: trimmed })
                    } else {
                      await createItem.mutateAsync({ name: trimmed })
                    }
                    setFormOpen(false)
                  } catch {
                    // Toast is shown by mutation onError; keep dialog open for retry
                  }
                })()
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
