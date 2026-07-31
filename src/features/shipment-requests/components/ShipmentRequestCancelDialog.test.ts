import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ShipmentRequestCancelDialog } from './ShipmentRequestCancelDialog'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: (props: { children?: unknown; open?: boolean }) =>
    props.open ? createElement('div', null, props.children as never) : null,
  DialogContent: (props: { children?: unknown }) =>
    createElement('div', null, props.children as never),
  DialogHeader: (props: { children?: unknown }) =>
    createElement('div', null, props.children as never),
  DialogTitle: (props: { children?: unknown }) =>
    createElement('h2', null, props.children as never),
  DialogFooter: (props: { children?: unknown }) =>
    createElement('div', null, props.children as never),
}))

vi.mock('@/components/ui/button', () => ({
  Button: (props: {
    children?: unknown
    disabled?: boolean
    onClick?: () => void
  }) =>
    createElement(
      'button',
      {
        type: 'button',
        disabled: props.disabled,
        onClick: props.onClick,
        'data-disabled': props.disabled ? 'true' : 'false',
      },
      props.children as never,
    ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: (props: { children?: unknown }) => createElement('label', null, props.children as never),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => createElement('textarea', props),
}))

describe('ShipmentRequestCancelDialog', () => {
  it('keeps confirm disabled until reason is entered', () => {
    const html = renderToStaticMarkup(
      createElement(ShipmentRequestCancelDialog, {
        open: true,
        onClose: () => undefined,
        onConfirm: () => undefined,
      }),
    )
    expect(html).toContain('Причина отмены')
    expect(html).toContain('data-disabled="true"')
    expect(html).toContain('Укажите причину')
  })
})
