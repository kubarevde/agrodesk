import { HelpCircle } from 'lucide-react'

export interface SectionHelpItem {
  question: string
  answer: string
}

interface SectionHelpProps {
  title?: string
  items: SectionHelpItem[]
}

/** Collapsible FAQ block for key product sections. */
export function SectionHelp({ title = 'Справка', items }: SectionHelpProps) {
  return (
    <details className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm open:pb-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <HelpCircle className="size-4 shrink-0 text-primary" aria-hidden />
        {title}
      </summary>
      <ul className="mt-3 space-y-3 text-muted-foreground">
        {items.map((item) => (
          <li key={item.question}>
            <p className="font-medium text-foreground">{item.question}</p>
            <p className="mt-0.5 leading-relaxed">{item.answer}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}
