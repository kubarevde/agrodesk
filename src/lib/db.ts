import Dexie, { type Table } from 'dexie'
import type {
  AgroPlan,
  Employee,
  EquipmentExtended,
  EquipmentMeterLog,
  Field,
  Implement,
  InventoryItem,
  Location,
  Notification,
  SharingListing,
  Shift,
  SyncQueueItem,
  WorkType,
} from '@/types'

export class AgroDeskDB extends Dexie {
  shifts!: Table<Shift>
  employees!: Table<Employee>
  locations!: Table<Location>
  workTypes!: Table<WorkType>
  equipment!: Table<EquipmentExtended>
  inventory!: Table<InventoryItem>
  syncQueue!: Table<SyncQueueItem>
  fields!: Table<Field>
  implements!: Table<Implement>
  sharingListings!: Table<SharingListing>
  notifications!: Table<Notification>
  agroPlan!: Table<AgroPlan>
  equipmentMeterLogs!: Table<EquipmentMeterLog>

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
    this.version(2).stores({
      shifts: 'id, date, status, employeeCode, fieldId',
      employees: 'id, employeeCode, role',
      locations: 'id, name',
      workTypes: 'id, name',
      equipment: 'id, name, meter_type, to_status',
      inventory: 'id, category',
      syncQueue: 'id, createdAt, status',
      fields: 'id, name, crop_type, is_active',
      implements: 'id, name, category, is_active',
      sharingListings: 'id, type, status',
      notifications: 'id, is_read, created_at',
      agroPlan: 'id, planned_date, field_id, status',
      equipmentMeterLogs: 'id, equipment_id, date',
    })
  }
}

export const db = new AgroDeskDB()
