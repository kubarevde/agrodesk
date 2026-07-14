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
import type { ImplementCondition } from './types'

export type ImplementCategoryStyle = {
  label: string
  icon: LucideIcon
  badgeClass: string
}

export const IMPLEMENT_CATEGORY_CONFIG: Record<string, ImplementCategoryStyle> = {
  Посевная: {
    label: 'Посевная',
    icon: Sprout,
    badgeClass: 'border-success/30 bg-success/10 text-success',
  },
  Опрыскивание: {
    label: 'Опрыскивание',
    icon: Droplets,
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700',
  },
  'Обработка почвы': {
    label: 'Обработка почвы',
    icon: Tractor,
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  },
  Уборочная: {
    label: 'Уборочная',
    icon: Wheat,
    badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-700',
  },
  Транспорт: {
    label: 'Транспорт',
    icon: Truck,
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700',
  },
}

export function getImplementCategoryConfig(category: string): ImplementCategoryStyle {
  return (
    IMPLEMENT_CATEGORY_CONFIG[category] ?? {
      label: category || 'Прочее',
      icon: Wrench,
      badgeClass: 'bg-muted text-muted-foreground',
    }
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
