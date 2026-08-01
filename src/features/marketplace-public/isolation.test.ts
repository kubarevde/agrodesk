import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname)

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

const FORBIDDEN = [
  '@/features/dashboard',
  '@/features/inventory',
  '@/features/auth/',
  '@/features/employees',
  '@/features/worktime',
  '@/lib/api\'',
  '@/lib/api"',
  'from \'@/lib/api\'',
  'from "@/lib/api"',
]

describe('marketplace-public import isolation', () => {
  it('does not import authenticated app features or JWT api client', () => {
    const files = walk(ROOT)
    expect(files.length).toBeGreaterThan(5)
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const needle of FORBIDDEN) {
        expect(src.includes(needle), `${file} must not contain ${needle}`).toBe(false)
      }
    }
  })
})
