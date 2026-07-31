import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  canManage: boolean
  onCreate: () => void
}

export function ShipmentsPageHeader({ canManage, onCreate }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Отгрузки урожая</h1>
        <p className="text-sm text-muted-foreground">
          Учёт реализации культур (кг). Наряды на ТМЦ — в «Заявках на отгрузку».
        </p>
      </div>
      {canManage ? (
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={onCreate}
        >
          <Plus className="size-4" />
          Добавить отгрузку
        </Button>
      ) : null}
    </div>
  )
}
