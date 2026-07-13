interface AgroLogoProps {
  showText: boolean
}

export function AgroLogo({ showText }: AgroLogoProps) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 overflow-hidden px-4">
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="size-8 shrink-0 text-primary"
        fill="currentColor"
      >
        <path d="M16 3c-1 4-3 7-6 9 1 0 2 0 3 1-2 1-4 3-5 6 2-1 4-1 6 0-1 3-3 5-6 6 2 1 3 2 4 4 1-3 3-5 6-6-2-1-3-2-4-4 1-3 3-5 6-6-2-1-4-1-6 0 1-3 3-5 5-6 1-1 2-1 3-1-3-2-5-5-6-9z" />
        <ellipse cx="16" cy="28" rx="8" ry="2" opacity="0.35" />
      </svg>
      {showText ? (
        <span className="truncate text-lg font-bold text-primary">АгроДеск</span>
      ) : null}
    </div>
  )
}
