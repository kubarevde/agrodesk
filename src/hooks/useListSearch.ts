import { useEffect, useRef, useState } from 'react'

type UseListSearchOptions = {
  /** Current value from URL / parent (optional). */
  search?: string
  /** Persist trimmed search (e.g. URL replace). */
  onSearchChange?: (search: string) => void
  debounceMs?: number
}

/** Debounced list search with optional URL sync — same pattern as InventoryPage. */
export function useListSearch({
  search = '',
  onSearchChange,
  debounceMs = 250,
}: UseListSearchOptions = {}) {
  const [searchInput, setSearchInput] = useState(search)
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim())
  const onSearchChangeRef = useRef(onSearchChange)
  onSearchChangeRef.current = onSearchChange
  const lastSyncedSearchRef = useRef(search.trim())

  useEffect(() => {
    const fromUrl = search.trim()
    if (fromUrl === lastSyncedSearchRef.current) return
    lastSyncedSearchRef.current = fromUrl
    setSearchInput(fromUrl)
    setDebouncedSearch(fromUrl)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      setDebouncedSearch(next)
      if (next === lastSyncedSearchRef.current) return
      lastSyncedSearchRef.current = next
      onSearchChangeRef.current?.(next)
    }, debounceMs)
    return () => window.clearTimeout(timer)
  }, [searchInput, debounceMs])

  return {
    searchInput,
    setSearchInput,
    debouncedSearch,
  }
}
