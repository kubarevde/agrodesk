/**
 * Base UI Select shows the raw value in SelectValue unless `items` is provided.
 * Always pass matching { value, label } entries for human-readable triggers.
 */
export type SelectOption = {
  value: string
  label: string
}

export function selectOptions(
  items: Array<{ value: string; label: string }>,
): SelectOption[] {
  return items
}

export function entityOptions<T>(
  entities: T[],
  getValue: (item: T) => string,
  getLabel: (item: T) => string,
  extras: SelectOption[] = [],
): SelectOption[] {
  return [
    ...extras,
    ...entities.map((item) => ({
      value: getValue(item),
      label: getLabel(item),
    })),
  ]
}
