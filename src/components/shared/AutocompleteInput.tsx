import { useId, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type AutocompleteInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Free-text suggestions; filtered by current value (case-insensitive). */
  suggestions: string[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  'aria-invalid'?: boolean
}

/**
 * Styled free-text field with suggestion list (replaces native datalist / browser autofill).
 * Value is never limited to suggestions — user can type any text.
 */
export function AutocompleteInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  required,
  disabled,
  className,
  'aria-invalid': ariaInvalid,
}: AutocompleteInputProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    const unique = [...new Set(suggestions.map((item) => item.trim()).filter(Boolean))]
    if (!q) return unique.slice(0, 12)
    return unique
      .filter((item) => item.toLowerCase().includes(q) && item.toLowerCase() !== q)
      .slice(0, 12)
  }, [suggestions, value])

  const showList = open && !disabled && filtered.length > 0

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={ariaInvalid}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Allow suggestion click before closing.
          window.setTimeout(() => setOpen(false), 120)
        }}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
        >
          {filtered.map((item) => (
            <li key={item} role="option">
              <button
                type="button"
                className="flex min-h-10 w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/60"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(item)
                  setOpen(false)
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
