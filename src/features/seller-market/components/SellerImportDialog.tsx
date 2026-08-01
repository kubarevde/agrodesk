import { useNavigate } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useImportFromSource, useImportSources } from '../hooks'

export function SellerImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sources = useImportSources(open)
  const importMut = useImportFromSource()
  const navigate = useNavigate()

  const runImport = async (source_type: 'inventory' | 'shipment', source_id: string) => {
    const row = await importMut.mutateAsync({ source_type, source_id })
    onOpenChange(false)
    void navigate({
      to: '/seller-market/listings/$listingId',
      params: { listingId: row.id },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт на витрину</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Создаётся черновик со snapshot остатка. Склад и отгрузки не списываются.
        </p>
        {sources.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4">
            <section>
              <h3 className="text-sm font-medium text-foreground">Склад</h3>
              <ul className="mt-2 space-y-2">
                {(sources.data?.inventory ?? []).map((item) => (
                  <li
                    key={item.source_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {item.name} · {item.quantity} {item.unit}
                      {item.already_imported ? (
                        <span className="ml-1 text-xs text-muted-foreground">(уже есть)</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={item.already_imported || importMut.isPending}
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                      onClick={() => void runImport('inventory', item.source_id)}
                    >
                      Импорт
                    </button>
                  </li>
                ))}
                {!sources.data?.inventory.length ? (
                  <p className="text-sm text-muted-foreground">Нет позиций склада</p>
                ) : null}
              </ul>
            </section>
            <section>
              <h3 className="text-sm font-medium text-foreground">Отгрузки урожая</h3>
              <ul className="mt-2 space-y-2">
                {(sources.data?.shipments ?? []).slice(0, 30).map((item) => (
                  <li
                    key={item.source_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {item.name} · {item.quantity} {item.unit}
                      {item.already_imported ? (
                        <span className="ml-1 text-xs text-muted-foreground">(уже есть)</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={item.already_imported || importMut.isPending}
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                      onClick={() => void runImport('shipment', item.source_id)}
                    >
                      Импорт
                    </button>
                  </li>
                ))}
                {!sources.data?.shipments.length ? (
                  <p className="text-sm text-muted-foreground">Нет отгрузок</p>
                ) : null}
              </ul>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
