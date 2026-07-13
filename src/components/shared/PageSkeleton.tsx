import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function PageSkeleton() {
  return (
    <div className="flex min-h-screen animate-pulse bg-background">
      <aside className="hidden w-60 shrink-0 flex-col gap-4 border-r border-header-border bg-surface p-4 md:flex">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-header-border bg-surface px-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>

        <div className={cn('flex-1 space-y-6 p-4 md:p-6')}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>

          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
