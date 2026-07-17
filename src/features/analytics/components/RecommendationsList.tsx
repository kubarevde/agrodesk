import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getRecommendationActionLink,
  humanizeRecommendationTitle,
  humanizeWhyNumbers,
} from '../lib/forecastUi'
import type { Recommendation } from '../types'

const LEVEL_LABEL: Record<string, string> = {
  info: 'Совет',
  warning: 'Внимание',
  critical: 'Срочно',
}

const LEVEL_ICON = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertTriangle,
} as const

const LEVEL_BORDER: Record<string, string> = {
  info: 'border-primary/30',
  warning: 'border-amber-500/50',
  critical: 'border-destructive/50',
}

type RecommendationsListProps = {
  items: Recommendation[]
}

function RecommendationCard({ item }: { item: Recommendation }) {
  const level = item.level in LEVEL_LABEL ? item.level : 'info'
  const Icon = LEVEL_ICON[level as keyof typeof LEVEL_ICON] ?? Info
  const derived = humanizeWhyNumbers(item.whyNumbers, level)
  const actionLink = getRecommendationActionLink(item.relatedEntityType, item.relatedEntityId)

  return (
    <Card className={LEVEL_BORDER[level] ?? 'border-border'}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{humanizeRecommendationTitle(item.title)}</CardTitle>
              <Badge variant="outline">{LEVEL_LABEL[level] ?? level}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Что произошло
          </p>
          <p className="mt-1 text-foreground">{item.explanation}</p>
          {derived.context ? <p className="mt-1 text-muted-foreground">{derived.context}</p> : null}
        </div>
        {derived.importance ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Почему это важно
            </p>
            <p className="mt-1 text-foreground">{derived.importance}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Что сделать
          </p>
          <p className="mt-1 font-medium text-foreground">{item.suggestedAction}</p>
        </div>
        {actionLink ? (
          <Link
            to={actionLink.to}
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted/40"
          >
            {actionLink.label}
            <ArrowRight className="ml-1 size-3.5" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function RecommendationsList({ items }: RecommendationsListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Сейчас нет активных рекомендаций — это хороший знак.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <RecommendationCard key={item.title + (item.relatedEntityId ?? '')} item={item} />
      ))}
    </div>
  )
}
