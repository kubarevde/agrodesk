import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Sprout,
  Tractor,
  Truck,
  Wheat,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { DictionaryItem } from '@/features/dictionaries/hooks'
import type { ImplementCondition } from './types'

export type ImplementCategoryStyle = {
  label: string
  icon: LucideIcon
  iconKey: string
  colorKey: string
  badgeClass: string
}

/** Lucide icon keys selectable in settings. */
export const IMPLEMENT_ICON_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'sprout', label: 'Росток', icon: Sprout },
  { value: 'droplets', label: 'Капли', icon: Droplets },
  { value: 'tractor', label: 'Трактор', icon: Tractor },
  { value: 'wheat', label: 'Колос', icon: Wheat },
  { value: 'truck', label: 'Транспорт', icon: Truck },
  { value: 'wrench', label: 'Ключ', icon: Wrench },
]

/** Token colors mapped to existing Tailwind design tokens / accents. */
export const IMPLEMENT_COLOR_OPTIONS: Array<{ value: string; label: string; badgeClass: string }> =
  [
    {
      value: 'success',
      label: 'Зелёный',
      badgeClass: 'border-success/30 bg-success/10 text-success',
    },
    {
      value: 'blue',
      label: 'Синий',
      badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700',
    },
    {
      value: 'amber',
      label: 'Янтарный',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    },
    {
      value: 'orange',
      label: 'Оранжевый',
      badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-700',
    },
    {
      value: 'violet',
      label: 'Фиолетовый',
      badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700',
    },
    {
      value: 'muted',
      label: 'Нейтральный',
      badgeClass: 'bg-muted text-muted-foreground',
    },
  ]

const ICON_BY_KEY: Record<string, LucideIcon> = Object.fromEntries(
  IMPLEMENT_ICON_OPTIONS.map((option) => [option.value, option.icon]),
)

const COLOR_BY_KEY: Record<string, string> = Object.fromEntries(
  IMPLEMENT_COLOR_OPTIONS.map((option) => [option.value, option.badgeClass]),
)

/** Legacy hard-coded look — used when dictionary has no icon/color yet. */
export const IMPLEMENT_CATEGORY_LEGACY: Record<string, { iconKey: string; colorKey: string }> = {
  Посевная: { iconKey: 'sprout', colorKey: 'success' },
  Опрыскивание: { iconKey: 'droplets', colorKey: 'blue' },
  'Обработка почвы': { iconKey: 'tractor', colorKey: 'amber' },
  Уборочная: { iconKey: 'wheat', colorKey: 'orange' },
  Транспорт: { iconKey: 'truck', colorKey: 'violet' },
}

function resolveStyleKeys(
  category: string,
  dictionaryItem?: Pick<DictionaryItem, 'name' | 'icon' | 'color'> | null,
): { iconKey: string; colorKey: string } {
  if (dictionaryItem?.icon || dictionaryItem?.color) {
    return {
      iconKey: dictionaryItem.icon || 'wrench',
      colorKey: dictionaryItem.color || 'muted',
    }
  }
  const legacy = IMPLEMENT_CATEGORY_LEGACY[category] ?? IMPLEMENT_CATEGORY_LEGACY[dictionaryItem?.name ?? '']
  if (legacy) return legacy
  return { iconKey: 'wrench', colorKey: 'muted' }
}

export function getImplementCategoryConfig(
  category: string,
  dictionaryItem?: Pick<DictionaryItem, 'name' | 'icon' | 'color'> | null,
): ImplementCategoryStyle {
  const { iconKey, colorKey } = resolveStyleKeys(category, dictionaryItem)
  return {
    label: category || dictionaryItem?.name || 'Прочее',
    icon: ICON_BY_KEY[iconKey] ?? Wrench,
    iconKey,
    colorKey,
    badgeClass: COLOR_BY_KEY[colorKey] ?? COLOR_BY_KEY.muted,
  }
}

export function findDictionaryCategory(
  category: string,
  dictionary: Array<Pick<DictionaryItem, 'name' | 'code' | 'icon' | 'color'>>,
) {
  return (
    dictionary.find((item) => item.name === category) ??
    dictionary.find((item) => item.code === category) ??
    null
  )
}

type ConditionStyle = {
  label: string
  icon: LucideIcon
  badgeClass: string
}

const CONDITION_CONFIG: Record<ImplementCondition, ConditionStyle> = {
  good: {
    label: 'Хорошее',
    icon: CheckCircle2,
    badgeClass: 'bg-success text-primary-foreground',
  },
  fair: {
    label: 'Удовл.',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500 text-primary-foreground',
  },
  poor: {
    label: 'Плохое',
    icon: XCircle,
    badgeClass: 'bg-orange-600 text-primary-foreground',
  },
  repair: {
    label: 'На ремонте',
    icon: Wrench,
    badgeClass: 'bg-destructive text-primary-foreground',
  },
}

export function getImplementConditionConfig(condition: string): ConditionStyle {
  if (condition in CONDITION_CONFIG) {
    return CONDITION_CONFIG[condition as ImplementCondition]
  }
  return {
    label: condition || '—',
    icon: Wrench,
    badgeClass: 'bg-muted text-muted-foreground',
  }
}
