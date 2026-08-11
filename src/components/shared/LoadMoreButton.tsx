import { Button } from '@/components/ui/button'

type LoadMoreButtonProps = {
  shown: number
  total: number
  hasMore: boolean
  onLoadMore: () => void
}

export function LoadMoreButton({ shown, total, hasMore, onLoadMore }: LoadMoreButtonProps) {
  if (total === 0) return null

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <p className="text-xs text-muted-foreground">
        Показано {shown} из {total}
      </p>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto sm:min-h-10"
          onClick={onLoadMore}
        >
          Показать ещё
        </Button>
      ) : null}
    </div>
  )
}
