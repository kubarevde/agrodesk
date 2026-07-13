import Dexie, { type Table } from 'dexie'
import type {
  Employee,
  Equipment,
  InventoryItem,
  Location,
  Shift,
  SyncQueueItem,
  WorkType,
} from '@/types'

export class AgroDeskDB extends Dexie {
  shifts!: Table<Shift>
  employees!: Table<Employee>
  locations!: Table<Location>
  workTypes!: Table<WorkType>
  equipment!: Table<Equipment>
  inventory!: Table<InventoryItem>
  syncQueue!: Table<SyncQueueItem>

  constructor() {
    super('agrodesk')
    this.version(1).stores({
      shifts: 'id, date, status, employeeCode',
      employees: 'id, employeeCode, role',
      locations: 'id, name',
      workTypes: 'id, name',
      equipment: 'id, name',
      inventory: 'id, category',
      syncQueue: 'id, createdAt',
    })
  }
}

export const db = new AgroDeskDB()
