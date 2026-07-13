import { http, HttpResponse } from 'msw'
import type { DashboardStats } from '@/types'
import { MOCK_SHIFTS } from './shifts'

const activeShifts = MOCK_SHIFTS.filter((shift) => shift.status === 'open').map(
  ({ id, employeeName, location, startTime, date }) => ({
    id,
    employeeName,
    location,
    startTime,
    date,
  }),
)

const dashboardStats: DashboardStats = {
  activeShiftsCount: activeShifts.length,
  activeShifts,
  todayHours: 18.5,
  monthShipmentWeight: 47200,
  criticalInventoryCount: 2,
  weeklyHours: [
    { day: 'Пн', hours: 8.5, shiftsCount: 4 },
    { day: 'Вт', hours: 7.0, shiftsCount: 3 },
    { day: 'Ср', hours: 9.5, shiftsCount: 5 },
    { day: 'Чт', hours: 8.0, shiftsCount: 4 },
    { day: 'Пт', hours: 10.0, shiftsCount: 5 },
    { day: 'Сб', hours: 6.5, shiftsCount: 3 },
    { day: 'Вс', hours: 0, shiftsCount: 0 },
  ],
}

export const dashboardHandlers = [
  http.get('/api/dashboard/stats', () => HttpResponse.json(dashboardStats)),
]
