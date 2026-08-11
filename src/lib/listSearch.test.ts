import { describe, expect, it } from 'vitest'
import { filterByListSearch, matchesListSearch, normalizeSearchTerm } from './listSearch'

describe('listSearch', () => {
  it('normalizes and matches substrings', () => {
    expect(normalizeSearchTerm('  Пшен ')).toBe('пшен')
    expect(matchesListSearch('пшен', 'Пшеница озимая')).toBe(true)
    expect(matchesListSearch('дт', 'Дизель', null)).toBe(false)
    expect(matchesListSearch('', 'anything')).toBe(true)
  })

  it('filters lists by haystacks', () => {
    const rows = [
      { id: '1', name: 'Поле Север', crop: 'Ячмень' },
      { id: '2', name: 'Юг', crop: 'Пшеница' },
    ]
    expect(
      filterByListSearch(rows, 'север', (row) => [row.name, row.crop]).map((r) => r.id),
    ).toEqual(['1'])
    expect(
      filterByListSearch(rows, 'пшен', (row) => [row.name, row.crop]).map((r) => r.id),
    ).toEqual(['2'])
  })
})
