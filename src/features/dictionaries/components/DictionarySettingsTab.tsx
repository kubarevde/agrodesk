import { Pencil, Plus, BookOpen, Sprout, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { AutocompleteInput } from '@/components/shared/AutocompleteInput'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import { CropVarietiesSheet } from './CropVarietiesSheet'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useCreateCropVariety, groupVarietiesByCropCode, useAllCropVarieties } from '../cropVarietyHooks'
import { CropVarietyNames } from './CropVarietyNames'

type DictionarySettingsTabProps = {
  type: DictionaryType
}

export function DictionarySettingsTab({ type }: DictionarySettingsTabProps) {
  const { data: items = [], isLoading, isError, refetch } = useDictionary(type, {
    activeOnly: false,
  })
  const createItem = useCreateDictionaryItem(type)
  const updateItem = useUpdateDictionaryItem(type)
  const createVariety = useCreateCropVariety()
  const showStyle = type === 'implement_category'
  const showInterval = type === 'maintenance_type'
  const showVarieties = type === 'crop'
  const { data: allVarieties = [] } = useAllCropVarieties({ enabled: showVarieties })
  const varietiesByCrop = useMemo(
    () => groupVarietiesByCropCode(allVarieties),
    [allVarieties],
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DictionaryItem | null>(null)
  const [name, setName] = useState('')
  const [varietyName, setVarietyName] = useState('')
  const [icon, setIcon] = useState('wrench')
  const [color, setColor] = useState('muted')
  const [defaultInterval, setDefaultInterval] = useState('')
  const [varietiesCrop, setVarietiesCrop] = useState<DictionaryItem | null>(null)

  const title = dictionaryTypeLabel(type)
  const nameSuggestions = useMemo(
    () => items.map((item) => item.name).filter(Boolean),
    [items],
  )

  const openCreate = () => {
    setEditing(null)
    setName('')
    setVarietyName('')
    setIcon('wrench')
    setColor('muted')
    setDefaultInterval('')
    setFormOpen(true)
  }

  const openEdit = (item: DictionaryItem) => {
    setEditing(item)
    setName(item.name)
    setVarietyName('')
    const style = getImplementCategoryConfig(item.name, item)
    setIcon(item.icon ?? style.iconKey)
    setColor(item.color ?? style.colorKey)
    setDefaultInterval(
      item.default_interval != null ? String(item.default_interval) : '',
    )
    setFormOpen(true)
  }

  const cropActions = (item: DictionaryItem) => {
    const base = [
      {
        id: 'edit',
        label: 'Редактировать',
        icon: Pencil,
        onSelect: () => openEdit(item),
      },
      {
        id: 'toggle',
        label: item.is_active ? 'Деактивировать' : 'Активировать',
        icon: item.is_active ? UserX : UserCheck,
        onSelect: () =>
          updateItem.mutate({
            id: item.id,
            is_active: !item.is_active,
          }),
      },
    ]
    if (!showVarieties) return base
    return [
      {
        id: 'varieties',
        label: 'Сорта',
        icon: Sprout,
        onSelect: () => setVarietiesCrop(item),
      },
      ...base,
    ]
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
        <SkeletonTable rows={4} columns={showStyle || showVarieties ? 4 : 3} />
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
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  {showVarieties ? <TableHead>Сорта</TableHead> : null}
                  {showStyle ? <TableHead>Вид</TableHead> : null}
                  {showInterval ? <TableHead>Интервал</TableHead> : null}
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
                      {showVarieties ? (
                        <TableCell className="max-w-xs min-w-0">
                          <CropVarietyNames
                            varieties={varietiesByCrop[item.code] ?? []}
                          />
                        </TableCell>
                      ) : null}
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
                      {showInterval ? (
                        <TableCell className="tabular-nums text-muted-foreground">
                          {item.default_interval != null ? item.default_interval : '—'}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <ActiveStatusBadge isActive={item.is_active} />
                      </TableCell>
                      <TableCell>
                        <CardActionsMenu
                          title={item.name}
                          ariaLabel="Действия"
                          actions={cropActions(item)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((item) => {
              const style = showStyle ? getImplementCategoryConfig(item.name, item) : null
              const Icon = style?.icon
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {showVarieties ? (
                        <CropVarietyNames
                          className="mt-1"
                          varieties={varietiesByCrop[item.code] ?? []}
                        />
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <ActiveStatusBadge isActive={item.is_active} />
                        {showStyle && style && Icon ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${style.badgeClass}`}
                          >
                            <Icon className="size-3.5" aria-hidden />
                            {style.label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <CardActionsMenu
                      title={item.name}
                      ariaLabel="Действия"
                      actions={cropActions(item)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {varietiesCrop ? (
        <CropVarietiesSheet
          open
          cropCode={varietiesCrop.code}
          cropName={varietiesCrop.name}
          onClose={() => setVarietiesCrop(null)}
        />
      ) : null}

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
              <AutocompleteInput
                id="dict-name"
                value={name}
                onChange={setName}
                suggestions={nameSuggestions}
                placeholder="Например: Пшеница"
              />
            </div>
            {showVarieties && !editing ? (
              <div className="space-y-2">
                <Label htmlFor="dict-variety">Сорт (необязательно)</Label>
                <Input
                  id="dict-variety"
                  value={varietyName}
                  onChange={(e) => setVarietyName(e.target.value)}
                  placeholder="Например: Рен"
                />
                <p className="text-xs text-muted-foreground">
                  Можно сразу завести первый сорт. Остальные — через «…» → «Сорта».
                </p>
              </div>
            ) : null}
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
            {showInterval ? (
              <div className="space-y-2">
                <Label htmlFor="dict-interval">Интервал по умолчанию</Label>
                <Input
                  id="dict-interval"
                  type="number"
                  min={0}
                  step="any"
                  value={defaultInterval}
                  onChange={(e) => setDefaultInterval(e.target.value)}
                  placeholder="Например: 250"
                />
                <p className="text-xs text-muted-foreground">
                  Подсказка для поля «Следующее ТО на…» (км / мч / ч). Можно оставить пустым.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={
                !name.trim() ||
                createItem.isPending ||
                updateItem.isPending ||
                createVariety.isPending
              }
              onClick={() => {
                const trimmed = name.trim()
                if (!trimmed) return
                const intervalValue =
                  defaultInterval.trim() === '' ? null : Number(defaultInterval)
                if (
                  showInterval &&
                  intervalValue != null &&
                  (!Number.isFinite(intervalValue) || intervalValue <= 0)
                ) {
                  return
                }
                void (async () => {
                  try {
                    if (editing) {
                      await updateItem.mutateAsync({
                        id: editing.id,
                        name: trimmed,
                        ...(showStyle ? { icon, color } : {}),
                        ...(showInterval ? { default_interval: intervalValue } : {}),
                      })
                    } else {
                      const created = await createItem.mutateAsync({
                        name: trimmed,
                        ...(showStyle ? { icon, color } : {}),
                        ...(showInterval ? { default_interval: intervalValue } : {}),
                      })
                      const varietyTrimmed = varietyName.trim()
                      if (showVarieties && varietyTrimmed) {
                        await createVariety.mutateAsync({
                          cropCode: created.code,
                          name: varietyTrimmed,
                        })
                      }
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
