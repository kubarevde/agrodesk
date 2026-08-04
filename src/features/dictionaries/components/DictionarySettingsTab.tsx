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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  IMPLEMENT_COLOR_OPTIONS,
  IMPLEMENT_ICON_OPTIONS,
  getImplementCategoryConfig,
} from '@/features/implements/categoryConfig'
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
  const { data: items = [], isLoading, isError, refetch } = useDictionary(type, {
    activeOnly: false,
  })
  const createItem = useCreateDictionaryItem(type)
  const updateItem = useUpdateDictionaryItem(type)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DictionaryItem | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('wrench')
  const [color, setColor] = useState('muted')
  const showStyle = type === 'implement_category'

  const title = dictionaryTypeLabel(type)

  const openCreate = () => {
    setEditing(null)
    setName('')
    setIcon('wrench')
    setColor('muted')
    setFormOpen(true)
  }

  const openEdit = (item: DictionaryItem) => {
    setEditing(item)
    setName(item.name)
    const style = getImplementCategoryConfig(item.name, item)
    setIcon(item.icon ?? style.iconKey)
    setColor(item.color ?? style.colorKey)
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
        <SkeletonTable rows={4} columns={showStyle ? 4 : 3} />
      ) : isError ? (
        <EmptyState
          icon={BookOpen}
          title={`Не удалось загрузить «${title}»`}
          description="Проверьте сеть и обновите список."
          action={{ label: 'Повторить', onClick: () => void refetch() }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={`Справочник «${title}» пуст`}
          action={{ label: 'Добавить', onClick: openCreate }}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                {showStyle ? <TableHead>Вид</TableHead> : null}
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const style = showStyle ? getImplementCategoryConfig(item.name, item) : null
                const Icon = style?.icon
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    {showStyle && style && Icon ? (
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${style.badgeClass}`}
                        >
                          <Icon className="size-3.5" aria-hidden />
                          {style.label}
                        </span>
                      </TableCell>
                    ) : null}
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
                )
              })}
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
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dict-name">Название</Label>
              <Input
                id="dict-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Например: Пшеница"
              />
            </div>
            {showStyle ? (
              <>
                <div className="space-y-2">
                  <Label>Иконка</Label>
                  <Select
                    value={icon}
                    onValueChange={(value) => setIcon(value ?? 'wrench')}
                    items={IMPLEMENT_ICON_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Иконка" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {IMPLEMENT_ICON_OPTIONS.map((option) => {
                        const OptionIcon = option.icon
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="inline-flex items-center gap-2">
                              <OptionIcon className="size-4" aria-hidden />
                              {option.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Цвет</Label>
                  <Select
                    value={color}
                    onValueChange={(value) => setColor(value ?? 'muted')}
                    items={IMPLEMENT_COLOR_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Цвет" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {IMPLEMENT_COLOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
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
                      await updateItem.mutateAsync({
                        id: editing.id,
                        name: trimmed,
                        ...(showStyle ? { icon, color } : {}),
                      })
                    } else {
                      await createItem.mutateAsync({
                        name: trimmed,
                        ...(showStyle ? { icon, color } : {}),
                      })
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
