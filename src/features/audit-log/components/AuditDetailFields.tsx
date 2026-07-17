import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AuditChangeRow } from '../lib/auditDetail'

type AuditDetailFieldsProps = {
  title: string
  rows: AuditChangeRow[]
  mode: 'create' | 'update' | 'delete' | 'other'
  technicalRows?: AuditChangeRow[]
}

function DetailRow({ row, mode }: { row: AuditChangeRow; mode: AuditDetailFieldsProps['mode'] }) {
  const isCreate = mode === 'create'
  const isDelete = mode === 'delete'

  if (isCreate) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{row.label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground break-words">{row.to ?? '—'}</p>
      </div>
    )
  }

  if (isDelete) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{row.label}</p>
        <p className="mt-0.5 text-sm text-foreground line-through opacity-80 break-words">
          {row.from ?? '—'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-muted/40 px-2.5 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Было</p>
          <p className="mt-0.5 text-sm text-foreground break-words">{row.from ?? '—'}</p>
        </div>
        <div className="rounded-md bg-primary/5 px-2.5 py-2 ring-1 ring-primary/10">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Стало</p>
          <p className="mt-0.5 text-sm font-medium text-foreground break-words">{row.to ?? '—'}</p>
        </div>
      </div>
    </div>
  )
}

export function AuditDetailFields({ title, rows, mode, technicalRows = [] }: AuditDetailFieldsProps) {
  const [techOpen, setTechOpen] = useState(false)

  if (rows.length === 0 && technicalRows.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
          Нет полей для отображения
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pr-1">
        {rows.map((row) => (
          <DetailRow key={row.field} row={row} mode={mode} />
        ))}
      </div>

      {technicalRows.length > 0 ? (
        <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={() => setTechOpen((v) => !v)}
          >
            <ChevronDown className={cn('mr-1 size-4 transition-transform', techOpen && 'rotate-180')} />
            Технические данные ({technicalRows.length})
          </Button>
          {techOpen ? (
            <div className="mt-2 space-y-1.5 rounded-lg border border-dashed border-border bg-muted/20 p-2">
              {technicalRows.map((row) => (
                <div key={row.field} className="flex flex-col gap-0.5 text-xs sm:flex-row sm:gap-2">
                  <span className="shrink-0 text-muted-foreground">{row.label}</span>
                  <span className="break-all text-foreground/70">
                    {mode === 'create' ? row.to : mode === 'delete' ? row.from : `${row.from ?? '—'} → ${row.to ?? '—'}`}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
