import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Banknote } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import type { IncomeLedgerEntry, ManualIncome } from '@/types'
import { useDeleteShipment, useShipments } from '@/features/shipments/hooks'
import { useDeleteTmcShipment, useTmcShipments } from '@/features/shipments/tmcHooks'
import { useDeleteManualIncome, useManualIncomes } from '../incomeHooks'
import {
  buildIncomeLedger,
  groupIncomeByCategory,
  isAutoIncomeFilter,
  matchesIncomeCategoryFilter,
  sumIncomeLedger,
} from '../incomeUtils'
import { IncomeBySourceChart } from './IncomeBySourceChart'
import { IncomeFiltersBar } from './IncomeFiltersBar'
import { IncomeFormModal } from './IncomeFormModal'
import { IncomeKpiCards } from './IncomeKpiCards'
import { IncomeLedgerCards } from './IncomeLedgerCards'
import { IncomeLedgerTable } from './IncomeLedgerTable'

interface IncomeTabProps {
  canManage: boolean
  canDelete: boolean
  isOnline: boolean
  from: string
  to: string
  defaultFrom: string
  defaultTo: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  formOpen: boolean
  onFormOpenChange: (open: boolean) => void
}

export function IncomeTab({
  canManage,
  canDelete,
  isOnline,
  from,
  to,
  defaultFrom,
  defaultTo,
  onRangeChange,
  formOpen,
  onFormOpenChange,
}: IncomeTabProps) {
  const navigate = useNavigate()
  const [category, setCategory] = useState<string | undefined>()
  const [editing, setEditing] = useState<ManualIncome | null>(null)
  const dateFilters = useMemo(() => ({ from, to }), [from, to])
  const manualFilters = useMemo(
    () => ({
      from,
      to,
      // Only dictionary codes go to /api/incomes; shipment filters are client-side.
      category: isAutoIncomeFilter(category) ? undefined : category,
    }),
    [from, to, category],
  )

  const harvestQ = useShipments(dateFilters)
  const tmcQ = useTmcShipments(dateFilters)
  const manualQ = useManualIncomes(manualFilters)
  const deleteIncome = useDeleteManualIncome()
  const deleteHarvest = useDeleteShipment()
  const deleteTmc = useDeleteTmcShipment()

  const isLoading = harvestQ.isLoading || tmcQ.isLoading || manualQ.isLoading
  const isError = harvestQ.isError || tmcQ.isError || manualQ.isError

  const ledger = useMemo(
    () =>
      buildIncomeLedger({
        harvest: harvestQ.data ?? [],
        tmc: tmcQ.data ?? [],
        manual: manualQ.data ?? [],
      }),
    [harvestQ.data, tmcQ.data, manualQ.data],
  )

  const filtered = useMemo(
    () => ledger.filter((row) => matchesIncomeCategoryFilter(row, category)),
    [ledger, category],
  )

  const total = useMemo(() => sumIncomeLedger(filtered), [filtered])
  const autoAmount = useMemo(
    () =>
      sumIncomeLedger(
        filtered.filter((row) => row.source === 'harvest_shipment' || row.source === 'tmc_shipment'),
      ),
    [filtered],
  )
  const manualAmount = useMemo(
    () => sumIncomeLedger(filtered.filter((row) => row.source === 'manual')),
    [filtered],
  )
  const chartData = useMemo(
    () =>
      groupIncomeByCategory(filtered).map((group) => ({
        category: group.key,
        amount: group.amount,
        percent: group.percent,
      })),
    [filtered],
  )

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить доходы')
  }, [isError])

  const openEdit = (entry: IncomeLedgerEntry) => {
    if (entry.source === 'manual') {
      const row = (manualQ.data ?? []).find((item) => item.id === entry.sourceId)
      if (!row) return
      setEditing(row)
      onFormOpenChange(true)
      return
    }
    void navigate({
      to: '/shipments',
      search: { tab: entry.source === 'tmc_shipment' ? 'tmc' : 'harvest' },
    })
  }

  const onDelete = (entry: IncomeLedgerEntry) => {
    if (entry.source === 'manual') {
      deleteIncome.mutate(entry.sourceId)
      return
    }
    if (entry.source === 'tmc_shipment') {
      deleteTmc.mutate(entry.sourceId)
      return
    }
    deleteHarvest.mutate(entry.sourceId)
  }

  return (
    <div className="space-y-6" data-testid="income-tab" data-domain="incomes">
      {!isOnline ? (
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Доходы: только просмотр / онлайн-запись"
          description="Ручные доходы можно добавлять только онлайн. Отгрузки подтягиваются из раздела «Отгрузки»."
        />
      ) : null}

      <IncomeKpiCards
        totalAmount={total}
        autoAmount={autoAmount}
        manualAmount={manualAmount}
        recordsCount={filtered.length}
        isLoading={isLoading}
      />

      <IncomeFiltersBar
        from={from}
        to={to}
        category={category}
        onRangeChange={({ from: nextFrom, to: nextTo }) =>
          onRangeChange({ from: nextFrom ?? defaultFrom, to: nextTo ?? defaultTo })
        }
        onCategoryChange={setCategory}
      />

      <IncomeBySourceChart data={chartData} isLoading={isLoading} />

      {isLoading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Доходов за период нет"
          description="Отгрузки с ценой появятся здесь автоматически. Другие доходы (услуги, шеринг) добавьте вручную."
          action={
            canManage
              ? {
                  label: 'Добавить доход',
                  onClick: () => {
                    setEditing(null)
                    onFormOpenChange(true)
                  },
                }
              : undefined
          }
        />
      ) : (
        <>
          <IncomeLedgerCards
            rows={filtered}
            canEdit={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            onEdit={openEdit}
            onDelete={onDelete}
          />
          <IncomeLedgerTable
            rows={filtered}
            canEdit={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            onEdit={openEdit}
            onDelete={onDelete}
          />
        </>
      )}

      {canManage ? (
        <IncomeFormModal
          key={editing?.id ?? 'create'}
          open={formOpen}
          income={editing}
          onClose={() => {
            onFormOpenChange(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
