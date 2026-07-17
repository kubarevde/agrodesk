import { useMemo } from 'react'
import { useEquipment } from '@/features/equipment/hooks'
import { useImplements } from '@/features/implements/hooks'

export type PlannerSearchFilters = {
  equipmentId?: string
  implementId?: string
  maintenanceId?: string
}

/** Detect mojibake / placeholder garbage in display names. */
export function looksLikeBrokenText(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  const t = value.trim()
  if (/^\?+$/.test(t)) return true
  const qCount = (t.match(/\?/g) ?? []).length
  if (qCount >= 3 && qCount / t.length > 0.3) return true
  return false
}

export function usePlannerFilterContext(filters: PlannerSearchFilters) {
  const { equipmentId, implementId, maintenanceId } = filters
  const hasFilter = Boolean(equipmentId || implementId || maintenanceId)

  const { data: equipment = [] } = useEquipment({ is_active: true })
  const { data: implementsList = [] } = useImplements()

  return useMemo(() => {
    if (!hasFilter) {
      return { hasFilter: false as const, bannerText: null, assetName: null }
    }

    let assetName: string | null = null
    if (equipmentId) {
      const name = equipment.find((e) => e.id === equipmentId)?.name
      assetName = name && !looksLikeBrokenText(name) ? name : 'выбранная техника'
    } else if (implementId) {
      const name = implementsList.find((i) => i.id === implementId)?.name
      assetName = name && !looksLikeBrokenText(name) ? name : 'выбранное приспособление'
    }

    const parts: string[] = []
    if (maintenanceId) {
      parts.push(
        assetName
          ? `Закупки для ремонта: ${assetName}`
          : 'Закупки для текущего ремонта',
      )
    } else if (assetName) {
      parts.push(`Показаны закупки для «${assetName}»`)
    }

    return {
      hasFilter: true as const,
      bannerText: parts.length > 0 ? parts.join('') : null,
      assetName,
    }
  }, [hasFilter, equipmentId, implementId, maintenanceId, equipment, implementsList])
}
