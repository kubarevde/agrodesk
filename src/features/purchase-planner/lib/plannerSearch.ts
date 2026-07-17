/** Default search params for /purchase-planner links (TanStack typed search). */
export const PURCHASE_PLANNER_SEARCH = {
  mode: undefined as 'checklist' | undefined,
  equipmentId: undefined as string | undefined,
  implementId: undefined as string | undefined,
  maintenanceId: undefined as string | undefined,
}

export function purchasePlannerSearch(
  partial: Partial<typeof PURCHASE_PLANNER_SEARCH> = {},
): typeof PURCHASE_PLANNER_SEARCH {
  return { ...PURCHASE_PLANNER_SEARCH, ...partial }
}
