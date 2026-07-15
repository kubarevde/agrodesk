import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  useEquipmentStockItems,
  useEquipmentStockOperations,
  type EquipmentStockFormValues,
  type EquipmentStockPurpose,
} from '../hooks'

const stockSchema = z.object({
  item_id: z.string().min(1, 'Выберите позицию'),
  quantity: z.number().positive('Укажите количество больше 0'),
  date: z.string().optional(),
  comment: z.string().optional(),
})

type EquipmentStockSectionProps = {
  title: string
  equipmentId: string
  purpose: EquipmentStockPurpose
  onSubmit: (values: EquipmentStockFormValues) => Promise<void>
  isPending: boolean
}

export function EquipmentStockSection({
  title,
  equipmentId,
  purpose,
  onSubmit,
  isPending,
}: EquipmentStockSectionProps) {
  const { data: items = [], isLoading: itemsLoading } = useEquipmentStockItems()
  const { data: operations = [], isLoading: opsLoading } = useEquipmentStockOperations(
    equipmentId,
    purpose,
  )
  const form = useForm<EquipmentStockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: { item_id: '', quantity: 0, date: '', comment: '' },
  })

  const filtered =
    purpose === 'refuel'
      ? items.filter((item) => item.category === 'fuel')
      : items.filter((item) =>
          ['parts', 'chemicals', 'other', 'fertilizer'].includes(item.category),
        )

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values)
          form.reset({ item_id: '', quantity: 0, date: '', comment: '' })
        })}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Позиция ТМЦ</Label>
          <Controller
            name="item_id"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={filtered.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.currentStock} ${item.unit})`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите позицию" />
                </SelectTrigger>
                <SelectContent>
                  {filtered.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.currentStock} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${purpose}-qty`}>Количество</Label>
          <Input
            id={`${purpose}-qty`}
            type="number"
            min={0}
            step="any"
            {...form.register('quantity', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${purpose}-date`}>Дата</Label>
          <Input id={`${purpose}-date`} type="date" {...form.register('date')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${purpose}-comment`}>Комментарий</Label>
          <Textarea id={`${purpose}-comment`} rows={2} {...form.register('comment')} />
        </div>
        <Button
          type="submit"
          disabled={isPending || itemsLoading}
          className="bg-primary hover:bg-primary-hover text-primary-foreground sm:col-span-2"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Записать
        </Button>
      </form>

      {opsLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : operations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Записей пока нет</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
          {operations.map((op) => (
            <li key={op.id}>
              {op.date}: {op.itemName} — {op.quantity}
              {op.reason ? ` (${op.reason})` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
