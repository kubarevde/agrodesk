import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FEATURES = join(__dirname, '..')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      out.push(full)
    }
  }
  return out
}

const CORE_FEATURES = ['dashboard', 'inventory', 'worktime', 'reports', 'expenses'] as const
const MARKET_FEATURES = ['marketplace-public', 'seller-market'] as const

describe('marketplace module boundaries (FE)', () => {
  it('marketplace-public does not import core farm features or JWT api', () => {
    const root = join(FEATURES, 'marketplace-public')
    const forbidden = [
      ...CORE_FEATURES.map((f) => `@/features/${f}`),
      "from '@/lib/api'",
      'from "@/lib/api"',
    ]
    for (const file of walk(root)) {
      const src = readFileSync(file, 'utf8')
      for (const needle of forbidden) {
        expect(src.includes(needle), `${file} must not contain ${needle}`).toBe(false)
      }
    }
  })

  it('seller-market does not import dashboard/inventory/worktime UI', () => {
    const root = join(FEATURES, 'seller-market')
    const forbidden = CORE_FEATURES.map((f) => `@/features/${f}`)
    for (const file of walk(root)) {
      const src = readFileSync(file, 'utf8')
      for (const needle of forbidden) {
        expect(src.includes(needle), `${file} must not contain ${needle}`).toBe(false)
      }
    }
  })

  it('core farm features do not import marketplace modules', () => {
    for (const core of CORE_FEATURES) {
      const root = join(FEATURES, core)
      for (const file of walk(root)) {
        const src = readFileSync(file, 'utf8')
        for (const market of MARKET_FEATURES) {
          const needle = `@/features/${market}`
          expect(src.includes(needle), `${file} must not contain ${needle}`).toBe(false)
        }
      }
    }
  })

  it('farm REPORT_DEFINITIONS has no marketplace entry', async () => {
    const { REPORT_DEFINITIONS } = await import('../reports/reportDefinitions')
    expect(REPORT_DEFINITIONS.some((r) => /market/i.test(r.id))).toBe(false)
    expect(
      REPORT_DEFINITIONS.some((r) => r.endpoint.includes('marketplace')),
    ).toBe(false)
  })
})
