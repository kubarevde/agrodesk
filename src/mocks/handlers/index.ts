export { shiftHandlers } from './shifts'
export { employeeHandlers } from './employees'
export { referenceHandlers } from './references'
export { dashboardHandlers } from './dashboard'
export { inventoryHandlers } from './inventory'

import { shiftHandlers } from './shifts'
import { employeeHandlers } from './employees'
import { referenceHandlers } from './references'
import { dashboardHandlers } from './dashboard'
import { inventoryHandlers } from './inventory'

export const handlers = [
  ...shiftHandlers,
  ...employeeHandlers,
  ...referenceHandlers,
  ...dashboardHandlers,
  ...inventoryHandlers,
]
