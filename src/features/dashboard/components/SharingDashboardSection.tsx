import { Handshake } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyListings } from '@/features/sharing/hooks'
import { cn } from '@/lib/utils'

type SharingDashboardSectionProps = {
  newRequests: number
  isLoadingStats: boolean
}

export function SharingDashboardSection({
  newRequests,
  isLoadingStats,
}: SharingDashboardSectionProps) {
  const { data: listings = [], isLoading } = useMyListings('active')
  const loading = isLoading || isLoadingStats

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">Шеринг</h2>
        <Link to="/sharing" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Перейти к шерингу →
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          {loading ? (
            <Skeleton className="h-5 w-56" />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Handshake className="size-4 text-muted-foreground" />
              <p className="text-sm text-foreground">
                Активных объявлений: <span className="font-semibold">{listings.length}</span>
              </p>
              <Badge variant={newRequests > 0 ? 'default' : 'secondary'}>
                {newRequests} новых заявок
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
