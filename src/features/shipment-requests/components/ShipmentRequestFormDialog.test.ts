import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ShipmentRequestFormDialog } from './ShipmentRequestFormDialog'

vi.mock('@/features/inventory/hooks', () => ({
  useInventory: () => ({
    data: [
      {
        id: 'item-1',
        name: 'Семена',
        unit: 'кг',
        isActive: true,
        currentStock: 50,
        category: 'seeds',
      },
      {
        id: 'item-2',
        name: 'Удобрение',
        unit: 'т',
        isActive: true,
        currentStock: 10,
        category: 'fertilizer',
      },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/features/employees/hooks', () => ({
  useEmployees: () => ({
    data: [{ id: 'emp-1', employeeName: 'Иванов', role: 'employee', isActive: true }],
    isLoading: false,
  }),
}))

vi.mock('../hooks', () => ({
  useCreateShipmentRequest: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useShipmentRequests: () => ({
    data: [{ id: 'sr-1', customerName: 'ООО Ромашка' }],
    isLoading: false,
  }),
}))

vi.mock('@/features/dictionaries/hooks', () => ({
  useDictionary: () => ({
    data: [
      { code: 'seeds', name: 'Семена' },
      { code: 'fertilizer', name: 'Удобрения' },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/components/shared/DateTimePicker', () => ({
  DateTimePicker: (props: Record<string, unknown>) =>
    createElement('input', { ...props, 'data-testid': 'datetime-picker' }),
}))

vi.mock('@/components/shared/AutocompleteInput', () => ({
  AutocompleteInput: (props: Record<string, unknown>) =>
    createElement('input', {
      id: props.id,
      value: props.value,
      placeholder: props.placeholder,
      required: props.required,
      'data-testid': 'autocomplete-input',
    }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: (props: { children?: unknown; open?: boolean }) =>
    props.open ? createElement('div', { 'data-testid': 'dialog' }, props.children as never) : null,
  DialogContent: (props: { children?: unknown }) =>
    createElement('div', null, props.children as never),
  DialogHeader: (props: { children?: unknown }) =>
    createElement('div', null, props.children as never),
  DialogTitle: (props: { children?: unknown }) =>
    createElement('h2', null, props.children as never),
  DialogFooter: (props: { children?: unknown }) =>
    createElement('div', null, props.children as never),
}))

vi.mock('@/components/ui/labeled-select', () => ({
  LabeledSelect: (props: {
    value?: string | null
    disabled?: boolean
    placeholder?: string
  }) =>
    createElement('select', {
      value: props.value ?? '',
      disabled: props.disabled,
      'data-testid': 'labeled-select',
      'data-value': props.value ?? '',
      'data-placeholder': props.placeholder,
      'data-disabled': props.disabled ? 'true' : 'false',
    }),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) =>
    createElement('textarea', { ...props, 'data-testid': 'comment' }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: (props: { children?: unknown; type?: string }) =>
    createElement('button', { type: props.type ?? 'button' }, props.children as never),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => createElement('input', props),
}))

vi.mock('@/components/ui/label', () => ({
  Label: (props: { children?: unknown }) => createElement('label', null, props.children as never),
}))

describe('ShipmentRequestFormDialog open sources', () => {
  it('opens from shipment-requests page without prefilled item', () => {
    const html = renderToStaticMarkup(
      createElement(ShipmentRequestFormDialog, {
        open: true,
        onClose: () => undefined,
        initialInventoryItemId: null,
      }),
    )
    expect(html).toContain('Заявка на отгрузку ТМЦ')
    expect(html).toContain('Категория ТМЦ')
    expect(html).toContain('Комментарий')
    expect(html).toContain('Ответственный')
  })

  it('opens from inventory card with prefilled ТМЦ locked', () => {
    const html = renderToStaticMarkup(
      createElement(ShipmentRequestFormDialog, {
        open: true,
        onClose: () => undefined,
        initialInventoryItemId: 'item-1',
      }),
    )
    expect(html).toContain('Заявка на отгрузку ТМЦ')
    expect(html).toContain('data-value="item-1"')
    expect(html).toContain('data-disabled="true"')
  })
})
