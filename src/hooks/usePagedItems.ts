import { useEffect, useMemo, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 20

/** Client-side windowing so long lists stay responsive. */
export function usePagedItems<T>(items: T[], resetKey: string, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey, pageSize])

  const visible = useMemo(() => items.slice(0, page * pageSize), [items, page, pageSize])
  const hasMore = visible.length < items.length

  return {
    visible,
    hasMore,
    shown: visible.length,
    total: items.length,
    loadMore: () => setPage((current) => current + 1),
  }
}
