import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  canManage: boolean
  showCreate?: boolean
  createLabel?: string
  onCreate: () => void
}

export function ShipmentsPageHeader({
  canManage,
  showCreate = true,
  createLabel = 'Добавить отгрузку',
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Отгрузки</h1>
        <p className="text-sm text-muted-foreground">
          Урожай по культурам и отгрузки ТМЦ по выполненным заявкам со склада
        </p>
      </div>
      {canManage && showCreate ? (
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={onCreate}
        >
          <Plus className="size-4" />
          {createLabel}
        </Button>
      ) : null}
    </div>
  )
}
