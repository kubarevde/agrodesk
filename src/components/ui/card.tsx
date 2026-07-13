import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="card-title" className={cn('text-sm font-medium text-muted-foreground', className)} {...props} />
  )
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-4 pt-0', className)} {...props} />
}

export { Card, CardContent, CardHeader, CardTitle }
