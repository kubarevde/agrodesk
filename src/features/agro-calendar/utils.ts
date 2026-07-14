const WORK_TYPE_COLORS: Record<string, string> = {
  Опрыскивание: 'border-primary/30 bg-primary/10 text-primary',
  Посев: 'border-success/30 bg-success/10 text-success',
  'Уборка урожая': 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  Культивация: 'border-orange-500/30 bg-orange-500/10 text-orange-700',
  Боронование: 'border-yellow-600/30 bg-yellow-500/10 text-yellow-800',
  Полив: 'border-blue-500/30 bg-blue-500/10 text-blue-700',
  'Ремонт техники': 'border-destructive/30 bg-destructive/10 text-destructive',
  'Разгрузка/погрузка': 'border-muted-foreground/30 bg-muted text-muted-foreground',
}

const FALLBACK_COLORS = [
  'border-primary/30 bg-primary/10 text-primary',
  'border-success/30 bg-success/10 text-success',
  'border-amber-500/30 bg-amber-500/10 text-amber-700',
  'border-blue-500/30 bg-blue-500/10 text-blue-700',
]

export function workTypeBadgeClass(name: string): string {
  if (WORK_TYPE_COLORS[name]) return WORK_TYPE_COLORS[name]
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i)) % FALLBACK_COLORS.length
  }
  return FALLBACK_COLORS[hash] ?? FALLBACK_COLORS[0]
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'done':
      return 'bg-success text-primary-foreground'
    case 'in_progress':
      return 'bg-primary text-primary-foreground'
    case 'cancelled':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-amber-500 text-primary-foreground'
  }
}

export function isoFromDisplayDate(display: string): string {
  const [day, month, year] = display.split('.')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function displayFromIsoDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}.${month}.${year}`
}

/** All ISO day keys in [plannedDate .. plannedEndDate], inclusive. */
export function expandPlanDayKeys(plannedDate: string, plannedEndDate?: string | null): string[] {
  const startKey = plannedDate.slice(0, 10)
  const endKey = (plannedEndDate ?? plannedDate).slice(0, 10)
  const rangeStart = startKey <= endKey ? startKey : endKey
  const rangeEnd = startKey <= endKey ? endKey : startKey

  const keys: string[] = []
  const cursor = new Date(`${rangeStart}T12:00:00`)
  const end = new Date(`${rangeEnd}T12:00:00`)

  while (cursor <= end) {
    keys.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    )
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}
