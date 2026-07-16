import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SectionMovedNoticeProps = {
  icon: LucideIcon
  title: string
  description: string
  to: '/fields' | '/equipment' | '/implements' | '/inventory' | '/worktime'
  actionLabel: string
}

export function SectionMovedNotice({
  icon: Icon,
  title,
  description,
  to,
  actionLabel,
}: SectionMovedNoticeProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Link to={to} className={cn(buttonVariants({ variant: 'default' }))}>
          {actionLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
