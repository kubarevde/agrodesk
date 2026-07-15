interface EmployeeRateCalculatorProps {
  text: string
}

export function EmployeeRateCalculator({ text }: EmployeeRateCalculatorProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
      <p className="text-xs text-muted-foreground">Пример: порог + 2 ч переработки</p>
      <p className="mt-1 font-medium">{text}</p>
    </div>
  )
}
