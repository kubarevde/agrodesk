/** Coerce empty numeric inputs to undefined (avoids leading-zero UX). */
export function emptyToUndefined(value: unknown): number | undefined {
  if (value === '' || value == null) return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** RHF register options for optional/required number fields without sticky 0. */
export const numberInputRegister = {
  setValueAs: emptyToUndefined,
} as const
