import { HelpCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { CurrentUser } from '@/lib/transformers'
import { cn } from '@/lib/utils'

export interface SectionHelpItem {
  question: string
  answer: string
  /** If set, item is shown only for these roles */
  roles?: Array<CurrentUser['role']>
}

interface SectionHelpProps {
  section?: string
  title?: string
  items: SectionHelpItem[]
  summary?: string
  className?: string
  /** Current user role — filters items that declare `roles` */
  role?: CurrentUser['role']
  /**
   * Deep-link key for /support/guide?section=…
   * Shows «Открыть общий гайд» under the FAQ.
   */
  guideSection?: string
}

export function filterHelpItems(
  items: SectionHelpItem[],
  role: CurrentUser['role'] | undefined,
): SectionHelpItem[] {
  if (!role) return items
  return items.filter((item) => !item.roles || item.roles.includes(role))
}

/**
 * Unified in-section help: collapsible FAQ with HelpCircle.
 * Tone: short, plain Russian, practical — same everywhere.
 */
export function SectionHelp({
  section,
  title,
  items,
  summary,
  className,
  role,
  guideSection,
}: SectionHelpProps) {
  const resolvedTitle = title ?? (section ? `Справка: ${section}` : 'Справка')
  const visible = filterHelpItems(items, role)

  if (visible.length === 0) return null

  return (
    <details
      className={cn(
        'rounded-xl border border-border bg-surface px-3 py-2.5 text-sm sm:px-4 sm:py-3',
        'open:pb-4',
        className,
      )}
    >
      <summary
        className={cn(
          'flex min-h-11 cursor-pointer list-none items-center gap-2',
          'font-medium text-foreground',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <HelpCircle className="size-5 shrink-0 text-primary" aria-hidden />
        <span>{resolvedTitle}</span>
      </summary>
      <div className="mt-3 space-y-3 border-t border-border pt-3 text-muted-foreground">
        {summary ? <p className="leading-relaxed text-foreground">{summary}</p> : null}
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.question}>
              <p className="font-medium text-foreground">{item.question}</p>
              <p className="mt-0.5 leading-relaxed">{item.answer}</p>
            </li>
          ))}
        </ul>
        {guideSection ? (
          <p className="pt-1">
            <Link
              to="/support/guide"
              search={{ section: guideSection }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Открыть общий гайд по системе
            </Link>
          </p>
        ) : null}
      </div>
    </details>
  )
}
