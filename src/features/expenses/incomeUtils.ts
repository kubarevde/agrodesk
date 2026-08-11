import type {
  IncomeLedgerEntry,
  IncomeLedgerSource,
  ManualIncome,
  Shipment,
  TmcShipment,
} from '@/types'
import {
  LEGACY_INCOME_CATEGORY_LABELS,
  resolveDictionaryLabel,
  type DictionaryLabelRow,
} from '@/features/dictionaries/labels'
import { formatMoney as formatMoneyBase } from '@/lib/format'
import { displayDateToIso } from '@/lib/transformers'

export { LEGACY_INCOME_CATEGORY_LABELS }

export const INCOME_SOURCE_LABELS: Record<IncomeLedgerSource, string> = {
  harvest_shipment: 'Отгрузка урожая',
  tmc_shipment: 'Отгрузка ТМЦ',
  manual: 'Вручную',
}

/** Extra filter values (not income_category dictionary codes). */
export const INCOME_FILTER_HARVEST = 'harvest_shipment'
export const INCOME_FILTER_TMC = 'tmc_shipment'

/** Fixed chart colors — distinct hues for auto sources + seeded income categories. */
export const INCOME_CATEGORY_COLORS: Readonly<Record<string, string>> = {
  harvest_shipment: '#01696F', // primary teal
  tmc_shipment: '#DA7101', // orange
  services: '#4A90D9', // blue
  sharing: '#8B5CF6', // purple
  other_sales: '#C9A227', // gold
  subsidy: '#437A22', // green
  other: '#E8792B', // warm
}

const INCOME_COLOR_FALLBACK = [
  '#0D9488',
  '#DB2777',
  '#2563EB',
  '#CA8A04',
  '#7C3AED',
  '#059669',
]

export function getIncomeCategoryColor(category: string): string {
  if (INCOME_CATEGORY_COLORS[category]) return INCOME_CATEGORY_COLORS[category]
  let hash = 0
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash + category.charCodeAt(i) * (i + 1)) % INCOME_COLOR_FALLBACK.length
  }
  return INCOME_COLOR_FALLBACK[Math.abs(hash) % INCOME_COLOR_FALLBACK.length]
}

/** Chart / filter bucket: auto source key, or manual dictionary code. */
export function incomeLedgerCategoryKey(row: IncomeLedgerEntry): string {
  if (row.source === 'manual') return row.title
  return row.source
}

export function isAutoIncomeFilter(value: string | undefined): boolean {
  return value === INCOME_FILTER_HARVEST || value === INCOME_FILTER_TMC
}

export function matchesIncomeCategoryFilter(
  row: IncomeLedgerEntry,
  category: string | undefined,
): boolean {
  if (!category) return true
  return incomeLedgerCategoryKey(row) === category
}

export function getIncomeCategoryLabel(
  category: string,
  dictionary?: DictionaryLabelRow[],
): string {
  return resolveDictionaryLabel(category, dictionary, LEGACY_INCOME_CATEGORY_LABELS)
}

export function formatIncomeMoney(value: number): string {
  return formatMoneyBase(value)
}

export function harvestShipmentsToLedger(shipments: Shipment[]): IncomeLedgerEntry[] {
  return shipments
    .filter((row) => (row.totalSum ?? 0) > 0)
    .map((row) => {
      const crop = row.cropType || 'Урожай'
      const variety = row.varietyName?.trim()
      return {
        id: `harvest:${row.id}`,
        source: 'harvest_shipment' as const,
        sourceId: row.id,
        date: row.date,
        groupKey: 'harvest_shipment',
        title: variety ? `${crop} · ${variety}` : crop,
        amount: row.totalSum ?? 0,
        description: row.notes || undefined,
        counterparty: row.destination || undefined,
        editable: false,
      }
    })
}

export function tmcShipmentsToLedger(shipments: TmcShipment[]): IncomeLedgerEntry[] {
  return shipments
    .filter((row) => (row.totalSum ?? 0) > 0)
    .map((row) => ({
      id: `tmc:${row.id}`,
      source: 'tmc_shipment' as const,
      sourceId: row.id,
      date: row.date,
      groupKey: 'tmc_shipment',
      title: row.itemName,
      amount: row.totalSum ?? 0,
      description: row.notes || undefined,
      counterparty: row.destination || undefined,
      editable: false,
    }))
}

export function manualIncomesToLedger(rows: ManualIncome[]): IncomeLedgerEntry[] {
  return rows.map((row) => ({
    id: `manual:${row.id}`,
    source: 'manual' as const,
    sourceId: row.id,
    date: row.date,
    groupKey: `manual:${row.category}`,
    title: row.category,
    amount: row.amount,
    description: row.description,
    counterparty: row.counterparty,
    paymentMethod: row.paymentMethod,
    editable: true,
  }))
}

export function buildIncomeLedger(input: {
  harvest: Shipment[]
  tmc: TmcShipment[]
  manual: ManualIncome[]
}): IncomeLedgerEntry[] {
  const rows = [
    ...harvestShipmentsToLedger(input.harvest),
    ...tmcShipmentsToLedger(input.tmc),
    ...manualIncomesToLedger(input.manual),
  ]
  return rows.sort((a, b) => {
    const da = displayDateToIso(a.date)
    const dbIso = displayDateToIso(b.date)
    if (da !== dbIso) return dbIso.localeCompare(da)
    return a.id.localeCompare(b.id)
  })
}

export function sumIncomeLedger(rows: IncomeLedgerEntry[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0)
}

export function groupIncomeByCategory(
  rows: IncomeLedgerEntry[],
  dictionary?: DictionaryLabelRow[],
): Array<{ key: string; label: string; amount: number; percent: number }> {
  const total = sumIncomeLedger(rows)
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = incomeLedgerCategoryKey(row)
    map.set(key, (map.get(key) ?? 0) + row.amount)
  }
  return Array.from(map.entries())
    .map(([key, amount]) => ({
      key,
      label:
        INCOME_SOURCE_LABELS[key as IncomeLedgerSource] ??
        getIncomeCategoryLabel(key, dictionary),
      amount,
      percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, 'ru'))
}

/** @deprecated use groupIncomeByCategory */
export function groupIncomeBySource(
  rows: IncomeLedgerEntry[],
): Array<{ key: string; label: string; amount: number; percent: number }> {
  return groupIncomeByCategory(rows)
}

export function findLargestIncomeSource(
  rows: IncomeLedgerEntry[],
): { key: string; label: string; amount: number } | null {
  const groups = groupIncomeByCategory(rows)
  if (groups.length === 0) return null
  const top = groups[0]
  return { key: top.key, label: top.label, amount: top.amount }
}
