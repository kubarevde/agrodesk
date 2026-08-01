import type { ReactNode } from 'react'

type OrgFormSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

/** Visual grouping for superadmin org modal — not a second form. */
export function OrgFormSection({ title, description, children }: OrgFormSectionProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
