import { Star } from 'lucide-react'
import type { PublicReviewCard } from '../types'

export function ReviewList({ reviews }: { reviews: PublicReviewCard[] }) {
  if (!reviews.length) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="reviews-empty">
        Отзывов пока нет.
      </p>
    )
  }

  return (
    <ul className="space-y-3" data-testid="review-list">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-lg border border-border bg-surface px-3 py-3 sm:px-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{review.author_name}</p>
            <span className="inline-flex items-center gap-0.5 text-sm tabular-nums text-primary">
              <Star className="size-3.5 fill-primary" aria-hidden />
              {review.rating}
            </span>
          </div>
          {review.comment ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
