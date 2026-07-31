import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ShipmentRequest } from '../types'

type Props = {
  row: ShipmentRequest
  canManage: boolean
  busy?: boolean
  onStart: (id: string) => void
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onAssign?: (id: string) => void
  /** Larger touch targets for mobile cards. */
  touchFriendly?: boolean
}

export function ShipmentRequestActions({
  row,
  canManage,
  busy,
  onStart,
  onComplete,
  onCancel,
  onAssign,
  touchFriendly = false,
}: Props) {
  const btnClass = touchFriendly ? 'min-h-11 flex-1 text-sm' : undefined
  const size = touchFriendly ? 'default' : 'sm'
  const canAssign =
    Boolean(canManage && onAssign) &&
    (row.status === 'new' || row.status === 'in_progress')

  return (
    <div className={cn('flex flex-wrap gap-2', touchFriendly && 'w-full')}>
      {row.status === 'new' ? (
        <Button
          type="button"
          size={size}
          variant="outline"
          className={btnClass}
          disabled={busy}
          onClick={() => onStart(row.id)}
        >
          В работу
        </Button>
      ) : null}
      {row.status === 'in_progress' ? (
        <Button
          type="button"
          size={size}
          className={btnClass}
          disabled={busy}
          onClick={() => onComplete(row.id)}
        >
          Выполнить
        </Button>
      ) : null}
      {canAssign ? (
        <Button
          type="button"
          size={size}
          variant="outline"
          className={btnClass}
          disabled={busy}
          onClick={() => onAssign?.(row.id)}
        >
          Назначить
        </Button>
      ) : null}
      {canManage && (row.status === 'new' || row.status === 'in_progress') ? (
        <Button
          type="button"
          size={size}
          variant="ghost"
          className={btnClass}
          disabled={busy}
          onClick={() => onCancel(row.id)}
        >
          Отмена
        </Button>
      ) : null}
    </div>
  )
}
