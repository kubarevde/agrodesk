import { useState } from 'react'
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
import { parseImportFromSourceError } from '../labels'
import type { ImportInventorySource, ImportShipmentSource } from '../types'

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
  const [conflict, setConflict] = useState<{ message: string; listingId: string | null } | null>(
    null,
  )

  const runImport = async (source_type: 'inventory' | 'shipment', source_id: string) => {
    setConflict(null)
    try {
      const row = await importMut.mutateAsync({ source_type, source_id })
      onOpenChange(false)
      void navigate({
        to: '/seller-market/listings/$listingId',
        params: { listingId: row.id },
      })
    } catch (error) {
      setConflict(parseImportFromSourceError(error))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConflict(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт на витрину</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          <p>
            Импорт создаёт черновик с привязкой к позиции склада или отгрузке. Название и единица
            копируются на сейчас; <strong className="font-medium text-foreground">количество на
            витрине берётся из источника</strong> при каждом просмотре.
          </p>
          <p>
            Склад при импорте и заявках <strong className="font-medium text-foreground">не
            списывается</strong>. Повторный импорт той же активной позиции запрещён (409).
          </p>
        </div>

        {conflict ? (
          <div
            className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm"
            role="alert"
            data-testid="import-conflict"
          >
            <p className="font-medium text-destructive">Уже импортировано</p>
            <p className="text-destructive/90">{conflict.message}</p>
            {conflict.listingId ? (
              <button
                type="button"
                className={cn(buttonVariants({ size: 'sm' }), 'bg-primary text-primary-foreground')}
                onClick={() => {
                  const listingId = conflict.listingId
                  if (!listingId) return
                  onOpenChange(false)
                  void navigate({
                    to: '/seller-market/listings/$listingId',
                    params: { listingId },
                  })
                }}
              >
                Открыть существующее объявление
              </button>
            ) : null}
          </div>
        ) : null}

        {sources.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4">
            <SourceSection
              title="Склад"
              empty="Нет позиций склада"
              items={sources.data?.inventory ?? []}
              busy={importMut.isPending}
              onImport={(id) => void runImport('inventory', id)}
            />
            <SourceSection
              title="Отгрузки урожая"
              empty="Нет отгрузок"
              items={(sources.data?.shipments ?? []).slice(0, 30)}
              busy={importMut.isPending}
              onImport={(id) => void runImport('shipment', id)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SourceSection({
  title,
  empty,
  items,
  busy,
  onImport,
}: {
  title: string
  empty: string
  items: Array<ImportInventorySource | ImportShipmentSource>
  busy: boolean
  onImport: (sourceId: string) => void
}) {
  return (
    <section>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item.source_id}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                Сейчас: {Number(item.quantity).toLocaleString('ru-RU')} {item.unit}
                {item.already_imported ? ' · уже есть объявление' : ''}
              </span>
            </span>
            <button
              type="button"
              disabled={item.already_imported || busy}
              className={cn(
                buttonVariants({ size: 'sm', variant: 'outline' }),
                'shrink-0 min-h-9',
              )}
              onClick={() => onImport(item.source_id)}
            >
              {item.already_imported ? 'Уже есть' : 'Импорт'}
            </button>
          </li>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      </ul>
    </section>
  )
}
