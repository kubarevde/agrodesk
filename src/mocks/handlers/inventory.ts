import { format, subDays } from 'date-fns'
import { http, HttpResponse } from 'msw'
import type { InventoryItem, InventoryOperation } from '@/types'

const BASE_DATE = new Date(2026, 6, 13)

const mockInventory: InventoryItem[] = [
  {
    id: 'inv-001',
    name: 'Дизельное топливо',
    category: 'fuel',
    unit: 'л',
    currentStock: 2340,
    minStock: 500,
    totalCapacity: 5000,
  },
  {
    id: 'inv-002',
    name: 'Аммиачная селитра',
    category: 'fertilizer',
    unit: 'кг',
    currentStock: 1200,
    minStock: 300,
    totalCapacity: 3000,
  },
  {
    id: 'inv-003',
    name: 'Подсолнечник семена',
    category: 'seeds',
    unit: 'кг',
    currentStock: 850,
    minStock: 200,
    totalCapacity: 2000,
  },
  {
    id: 'inv-004',
    name: 'Гербицид Балерина',
    category: 'chemicals',
    unit: 'л',
    currentStock: 45,
    minStock: 50,
    totalCapacity: 200,
  },
  {
    id: 'inv-005',
    name: 'Масло моторное М-10',
    category: 'parts',
    unit: 'л',
    currentStock: 80,
    minStock: 100,
    totalCapacity: 200,
  },
  {
    id: 'inv-006',
    name: 'Запчасти МТЗ',
    category: 'parts',
    unit: 'шт',
    currentStock: 5,
    minStock: 5,
    totalCapacity: 20,
  },
  {
    id: 'inv-007',
    name: 'Пшеница семенная',
    category: 'seeds',
    unit: 'кг',
    currentStock: 4500,
    minStock: 1000,
    totalCapacity: 5000,
  },
  {
    id: 'inv-008',
    name: 'Аммофос',
    category: 'fertilizer',
    unit: 'кг',
    currentStock: 600,
    minStock: 200,
    totalCapacity: 1500,
  },
]

const mockOperations: InventoryOperation[] = [
  {
    id: 'op-001',
    date: format(subDays(BASE_DATE, 1), 'dd.MM.yyyy'),
    itemId: 'inv-001',
    itemName: 'Дизельное топливо',
    type: 'expense',
    quantity: 320,
    stockAfter: 2340,
    reason: 'Заправка техники',
  },
  {
    id: 'op-002',
    date: format(subDays(BASE_DATE, 1), 'dd.MM.yyyy'),
    itemId: 'inv-004',
    itemName: 'Гербицид Балерина',
    type: 'expense',
    quantity: 12,
    stockAfter: 45,
    reason: 'Опрыскивание поля №2',
  },
  {
    id: 'op-003',
    date: format(subDays(BASE_DATE, 2), 'dd.MM.yyyy'),
    itemId: 'inv-002',
    itemName: 'Аммиачная селитра',
    type: 'income',
    quantity: 500,
    stockAfter: 1200,
    supplier: 'АгроХим Снаб',
    cost: 185000,
  },
  {
    id: 'op-004',
    date: format(subDays(BASE_DATE, 3), 'dd.MM.yyyy'),
    itemId: 'inv-007',
    itemName: 'Пшеница семенная',
    type: 'expense',
    quantity: 200,
    stockAfter: 4500,
    reason: 'Посев на поле №1',
  },
  {
    id: 'op-005',
    date: format(subDays(BASE_DATE, 4), 'dd.MM.yyyy'),
    itemId: 'inv-005',
    itemName: 'Масло моторное М-10',
    type: 'expense',
    quantity: 20,
    stockAfter: 80,
    reason: 'ТО трактора МТЗ-82',
  },
  {
    id: 'op-006',
    date: format(subDays(BASE_DATE, 5), 'dd.MM.yyyy'),
    itemId: 'inv-001',
    itemName: 'Дизельное топливо',
    type: 'income',
    quantity: 1000,
    stockAfter: 2660,
    supplier: 'Лукойл',
    cost: 72000,
  },
  {
    id: 'op-007',
    date: format(subDays(BASE_DATE, 6), 'dd.MM.yyyy'),
    itemId: 'inv-003',
    itemName: 'Подсолнечник семена',
    type: 'expense',
    quantity: 150,
    stockAfter: 850,
    reason: 'Посев на поле №2',
  },
  {
    id: 'op-008',
    date: format(subDays(BASE_DATE, 7), 'dd.MM.yyyy'),
    itemId: 'inv-006',
    itemName: 'Запчасти МТЗ',
    type: 'expense',
    quantity: 2,
    stockAfter: 5,
    reason: 'Замена фильтров',
  },
  {
    id: 'op-009',
    date: format(subDays(BASE_DATE, 8), 'dd.MM.yyyy'),
    itemId: 'inv-008',
    itemName: 'Аммофос',
    type: 'income',
    quantity: 300,
    stockAfter: 600,
    supplier: 'ФосАгро',
    cost: 96000,
  },
  {
    id: 'op-010',
    date: format(subDays(BASE_DATE, 9), 'dd.MM.yyyy'),
    itemId: 'inv-001',
    itemName: 'Дизельное топливо',
    type: 'expense',
    quantity: 280,
    stockAfter: 1660,
    reason: 'Уборка урожая',
  },
  {
    id: 'op-011',
    date: format(subDays(BASE_DATE, 10), 'dd.MM.yyyy'),
    itemId: 'inv-004',
    itemName: 'Гербицид Балерина',
    type: 'income',
    quantity: 50,
    stockAfter: 57,
    supplier: 'Сингента',
    cost: 42000,
  },
  {
    id: 'op-012',
    date: format(subDays(BASE_DATE, 11), 'dd.MM.yyyy'),
    itemId: 'inv-005',
    itemName: 'Масло моторное М-10',
    type: 'income',
    quantity: 40,
    stockAfter: 100,
    supplier: 'Автодизель',
    cost: 18000,
  },
  {
    id: 'op-013',
    date: format(subDays(BASE_DATE, 12), 'dd.MM.yyyy'),
    itemId: 'inv-002',
    itemName: 'Аммиачная селитра',
    type: 'expense',
    quantity: 100,
    stockAfter: 700,
    reason: 'Внесение удобрений',
  },
  {
    id: 'op-014',
    date: format(subDays(BASE_DATE, 13), 'dd.MM.yyyy'),
    itemId: 'inv-007',
    itemName: 'Пшеница семенная',
    type: 'income',
    quantity: 2000,
    stockAfter: 4700,
    supplier: 'ЭлитСемена',
    cost: 560000,
  },
  {
    id: 'op-015',
    date: format(subDays(BASE_DATE, 14), 'dd.MM.yyyy'),
    itemId: 'inv-003',
    itemName: 'Подсолнечник семена',
    type: 'income',
    quantity: 500,
    stockAfter: 1000,
    supplier: 'ЭлитСемена',
    cost: 145000,
  },
]

export const inventoryHandlers = [
  http.get('/api/inventory', () => HttpResponse.json(mockInventory)),
  http.get('/api/inventory/operations', () => HttpResponse.json(mockOperations)),

  http.post('/api/inventory/income', async ({ request }) => {
    const body = (await request.json()) as {
      itemId: string
      quantity: number
      supplier: string
      cost: number
      date: string
    }

    const item = mockInventory.find((entry) => entry.id === body.itemId)
    if (!item) {
      return HttpResponse.json({ message: 'Позиция не найдена' }, { status: 404 })
    }

    item.currentStock += body.quantity
    const operation: InventoryOperation = {
      id: crypto.randomUUID(),
      date: body.date,
      itemId: item.id,
      itemName: item.name,
      type: 'income',
      quantity: body.quantity,
      stockAfter: item.currentStock,
      supplier: body.supplier,
      cost: body.cost,
    }
    mockOperations.unshift(operation)
    return HttpResponse.json(operation, { status: 201 })
  }),

  http.post('/api/inventory/expense', async ({ request }) => {
    const body = (await request.json()) as {
      itemId: string
      quantity: number
      reason: string
    }

    const item = mockInventory.find((entry) => entry.id === body.itemId)
    if (!item) {
      return HttpResponse.json({ message: 'Позиция не найдена' }, { status: 404 })
    }

    if (body.quantity > item.currentStock) {
      return HttpResponse.json({ message: 'Недостаточно остатка' }, { status: 400 })
    }

    item.currentStock -= body.quantity
    const operation: InventoryOperation = {
      id: crypto.randomUUID(),
      date: format(BASE_DATE, 'dd.MM.yyyy'),
      itemId: item.id,
      itemName: item.name,
      type: 'expense',
      quantity: body.quantity,
      stockAfter: item.currentStock,
      reason: body.reason,
    }
    mockOperations.unshift(operation)
    return HttpResponse.json(operation, { status: 201 })
  }),
]
