import { useEffect, useState } from 'react'

/** True when viewport matches the query (client-only; SSR-safe default false). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Shared mobile breakpoint used by tables → card swaps (max-width: 767px). */
export function useIsMobile(maxWidthPx = 767): boolean {
  return useMediaQuery(`(max-width: ${maxWidthPx}px)`)
}
