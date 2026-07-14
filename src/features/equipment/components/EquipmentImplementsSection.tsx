import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAttachImplement, useImplements } from '@/features/implements/hooks'
import type { ImplementResponse } from '@/features/implements/types'
import { useImplementsByEquipment } from '../hooks'

type EquipmentImplementsSectionProps = {
  equipmentId: string
  canManage: boolean
}

export function EquipmentImplementsSection({
  equipmentId,
  canManage,
}: EquipmentImplementsSectionProps) {
  const { data: attached = [], isLoading } = useImplementsByEquipment(equipmentId)
  const { data: allImplements = [] } = useImplements()
  const attach = useAttachImplement()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')

  const free = allImplements.filter((item) => !item.current_equipment_id)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Прикреплённые приспособления</h2>
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            Прикрепить приспособление
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : attached.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет прикреплённых приспособлений</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {attached.map((item: ImplementResponse) => (
            <Link
              key={item.id}
              to="/implements/$implementId"
              params={{ implementId: item.id }}
              className="inline-flex"
            >
              <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                {item.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Прикрепить приспособление</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Свободные приспособления</Label>
            <Select
              value={selectedId || undefined}
              onValueChange={(value) => setSelectedId(value ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent>
                {free.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {free.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет свободных приспособлений</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              disabled={!selectedId || attach.isPending}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={async () => {
                await attach.mutateAsync({
                  id: selectedId,
                  values: { equipment_id: equipmentId },
                })
                setSelectedId('')
                setOpen(false)
              }}
            >
              Прикрепить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
