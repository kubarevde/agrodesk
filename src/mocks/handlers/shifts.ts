import { format, subDays } from 'date-fns'
import { delay, http, HttpResponse } from 'msw'
import type { Shift } from '@/types'
import { mockEmployees } from './employees'

const WORK_TYPES = [
  'Посев',
  'Уборка урожая',
  'Культивация',
  'Боронование',
  'Опрыскивание',
  'Ремонт техники',
  'Разгрузка/погрузка',
  'Полив',
] as const

const LOCATIONS = [
  'Поле №1',
  'Поле №2',
  'Поле №3',
  'Поле №4',
  'Зернохранилище',
  'Мастерская',
  'Административный корпус',
] as const

const EQUIPMENT = [
  'МТЗ-82',
  'К-700',
  'Дон-1500',
  'Газель',
  'КамАЗ',
  'Опрыскиватель Jacto',
  'Культиватор КПС-4',
  'Сеялка СЗ-3.6',
] as const

const DESCRIPTIONS = [
  'Посев пшеницы на поле',
  'Уборка подсолнечника',
  'Культивация междурядий',
  'Боронование после дождя',
  'Опрыскивание гербицидами',
  'Ремонт гидравлики трактора',
  'Разгрузка зерна на склад',
  'Полив посевов кукурузы',
  'Подготовка почвы к посеву',
  'Обслуживание комбайна',
] as const

const BASE_DATE = new Date(2026, 6, 13)

const SHIFT_TEMPLATE = [
  { dayOffset: 0, employeeIndex: 0, startTime: '07:15:00', hours: 8, workType: 0, location: 0, equipment: 0, description: 0, open: false, geo: false },
  { dayOffset: 0, employeeIndex: 1, startTime: '08:00:00', hours: 9, workType: 1, location: 1, equipment: 2, description: 1, open: false, geo: false },
  { dayOffset: 1, employeeIndex: 2, startTime: '07:30:00', hours: 8.5, workType: 4, location: 2, equipment: 5, description: 4, open: true, geo: false },
  { dayOffset: 1, employeeIndex: 3, startTime: '09:00:00', hours: 7, workType: 6, location: 4, equipment: 4, description: 6, open: false, geo: true },
  { dayOffset: 2, employeeIndex: 4, startTime: '07:00:00', hours: 10, workType: 2, location: 3, equipment: 6, description: 2, open: false, geo: false },
  { dayOffset: 3, employeeIndex: 0, startTime: '08:30:00', hours: 8, workType: 0, location: 0, equipment: 7, description: 8, open: false, geo: false },
  { dayOffset: 4, employeeIndex: 1, startTime: '07:45:00', hours: 9.5, workType: 1, location: 1, equipment: 2, description: 1, open: false, geo: false },
  { dayOffset: 5, employeeIndex: 2, startTime: '08:15:00', hours: 7.5, workType: 3, location: 2, equipment: 0, description: 3, open: false, geo: false },
  { dayOffset: 6, employeeIndex: 3, startTime: '07:20:00', hours: 8, workType: 7, location: 2, equipment: 5, description: 7, open: false, geo: true },
  { dayOffset: 7, employeeIndex: 4, startTime: '09:30:00', hours: 7, workType: 5, location: 5, equipment: 0, description: 5, open: false, geo: false },
  { dayOffset: 8, employeeIndex: 0, startTime: '07:10:00', hours: 9, workType: 2, location: 0, equipment: 6, description: 2, open: false, geo: false },
  { dayOffset: 9, employeeIndex: 1, startTime: '08:45:00', hours: 8, workType: 4, location: 1, equipment: 5, description: 4, open: false, geo: false },
  { dayOffset: 10, employeeIndex: 2, startTime: '07:00:00', hours: 10, workType: 0, location: 3, equipment: 7, description: 0, open: false, geo: true },
  { dayOffset: 11, employeeIndex: 3, startTime: '08:20:00', hours: 7.5, workType: 6, location: 4, equipment: 3, description: 6, open: false, geo: false },
  { dayOffset: 12, employeeIndex: 4, startTime: '07:50:00', hours: 8.5, workType: 1, location: 1, equipment: 2, description: 1, open: false, geo: false },
  { dayOffset: 13, employeeIndex: 0, startTime: '09:15:00', hours: 7, workType: 5, location: 5, equipment: 1, description: 9, open: true, geo: false },
  { dayOffset: 14, employeeIndex: 1, startTime: '07:25:00', hours: 9, workType: 3, location: 0, equipment: 6, description: 3, open: false, geo: true },
  { dayOffset: 15, employeeIndex: 2, startTime: '08:05:00', hours: 8, workType: 7, location: 2, equipment: 5, description: 7, open: false, geo: false },
  { dayOffset: 16, employeeIndex: 3, startTime: '07:40:00', hours: 8.5, workType: 2, location: 3, equipment: 0, description: 2, open: false, geo: false },
  { dayOffset: 17, employeeIndex: 4, startTime: '08:55:00', hours: 7, workType: 4, location: 1, equipment: 5, description: 4, open: false, geo: false },
  { dayOffset: 18, employeeIndex: 0, startTime: '07:05:00', hours: 9.5, workType: 1, location: 0, equipment: 2, description: 1, open: false, geo: false },
  { dayOffset: 19, employeeIndex: 1, startTime: '08:35:00', hours: 8, workType: 0, location: 2, equipment: 7, description: 8, open: false, geo: false },
  { dayOffset: 20, employeeIndex: 2, startTime: '07:55:00', hours: 7.5, workType: 6, location: 4, equipment: 4, description: 6, open: false, geo: false },
  { dayOffset: 21, employeeIndex: 3, startTime: '09:10:00', hours: 8, workType: 5, location: 5, equipment: 0, description: 5, open: false, geo: false },
  { dayOffset: 22, employeeIndex: 4, startTime: '07:35:00', hours: 10, workType: 3, location: 3, equipment: 6, description: 3, open: false, geo: false },
  { dayOffset: 23, employeeIndex: 0, startTime: '08:25:00', hours: 8.5, workType: 2, location: 0, equipment: 1, description: 2, open: false, geo: false },
  { dayOffset: 24, employeeIndex: 1, startTime: '07:50:00', hours: 7, workType: 7, location: 2, equipment: 5, description: 7, open: false, geo: false },
  { dayOffset: 25, employeeIndex: 2, startTime: '08:40:00', hours: 9, workType: 4, location: 1, equipment: 5, description: 4, open: false, geo: false },
  { dayOffset: 26, employeeIndex: 3, startTime: '07:15:00', hours: 8, workType: 1, location: 1, equipment: 2, description: 1, open: false, geo: false },
  { dayOffset: 27, employeeIndex: 4, startTime: '09:00:00', hours: 7.5, workType: 0, location: 3, equipment: 7, description: 0, open: true, geo: false },
] as const

const SHIFT_IDS = [
  'a3f8c2d1-4b6e-4a9f-9c1d-2e5f6a7b8c9d',
  'b4e9d3e2-5c7f-5b0a-0d2e-3f6a7b8c9d0e',
  'c5f0e4f3-6d8a-6c1b-1e3f-4a7b8c9d0e1f',
  'd6a1f5a4-7e9b-7d2c-2f4a-5b8c9d0e1f2a',
  'e7b2a6b5-8f0c-8e3d-3a5b-6c9d0e1f2a3b',
  'f8c3b7c6-9a1d-9f4e-4b6c-7d0e1f2a3b4c',
  'a9d4c8d7-0b2e-0a5f-5c7d-8e1f2a3b4c5d',
  'b0e5d9e8-1c3f-1b6a-6d8e-9f2a3b4c5d6e',
  'c1f6e0f9-2d4a-2c7b-7e9f-0a3b4c5d6e7f',
  'd2a7f1a0-3e5b-3d8c-8f0a-1b4c5d6e7f8a',
  'e3b8a2b1-4f6c-4e9d-9a1b-2c5d6e7f8a9b',
  'f4c9b3c2-5a7d-5f0e-0b2c-3d6e7f8a9b0c',
  'a5d0c4d3-6b8e-6a1f-1c3d-4e7f8a9b0c1d',
  'b6e1d5e4-7c9f-7b2a-2d4e-5f8a9b0c1d2e',
  'c7f2e6f5-8d0a-8c3b-3e5f-6a9b0c1d2e3f',
  'd8a3f7a6-9e1b-9d4c-4f6a-7b0c1d2e3f4a',
  'e9b4a8b7-0f2c-0e5d-5a7b-8c1d2e3f4a5b',
  'f0c5b9c8-1a3d-1f6e-6b8c-9d2e3f4a5b6c',
  'a1d6c0d9-2b4e-2a7f-7c9d-0e3f4a5b6c7d',
  'b2e7d1e0-3c5f-3b8a-8d0e-1f4a5b6c7d8e',
  'c3f8e2f1-4d6a-4c9b-9e1f-2a5b6c7d8e9f',
  'd4a9f3a2-5e7b-5d0c-0f2a-3b6c7d8e9f0a',
  'e5b0a4b3-6f8c-6e1d-1a3b-4c7d8e9f0a1b',
  'f6c1b5c4-7a9d-7f2e-2b4c-5d8e9f0a1b2c',
  'a7d2c6d5-8b0e-8a3f-3c5d-6e9f0a1b2c3d',
  'b8e3d7e6-9c1f-9b4a-4d6e-7f0a1b2c3d4e',
  'c9f4e8f7-0d2a-0c5b-5e7f-8a1b2c3d4e5f',
  'd0a5f9a8-1e3b-1d6c-6f8a-9b2c3d4e5f6a',
  'e1b6a0b9-2f4c-2e7d-7a9b-0c3d4e5f6a7b',
] as const

function addHoursToTime(startTime: string, hours: number): string {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const totalMinutes = startHours * 60 + startMinutes + Math.round(hours * 60)
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`
}

function calcDuration(
  startTime: string,
  endTime: string | null,
): { durationRaw: number | null; durationRounded: number | null } {
  if (!endTime) {
    return { durationRaw: null, durationRounded: null }
  }

  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const durationRaw = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)
  const durationRounded = Math.round((durationRaw / 60) * 2) / 2

  return { durationRaw, durationRounded }
}

function parseShiftDate(date: string): Date {
  const [day, month, year] = date.split('.').map(Number)
  return new Date(year, month - 1, day)
}

function createMockShifts(): Shift[] {
  return SHIFT_TEMPLATE.map((template, index) => {
    const employee = mockEmployees[template.employeeIndex]
    const date = format(subDays(BASE_DATE, Math.min(template.dayOffset, 12)), 'dd.MM.yyyy')
    const endTime = template.open ? null : addHoursToTime(template.startTime, template.hours)
    const { durationRaw, durationRounded } = calcDuration(template.startTime, endTime)

    return {
      id: SHIFT_IDS[index],
      date,
      employeeCode: employee.employeeCode,
      employeeName: employee.employeeName,
      telegramId: employee.telegramId,
      startTime: template.startTime,
      endTime,
      workType: WORK_TYPES[template.workType],
      location: LOCATIONS[template.location],
      equipment: EQUIPMENT[template.equipment],
      description: DESCRIPTIONS[template.description],
      comment: index % 4 === 0 ? 'Смена прошла без замечаний' : '',
      status: template.open ? 'open' : 'closed',
      durationRaw,
      durationRounded,
      latitude: template.geo ? 51.2 + index * 0.01 : null,
      longitude: template.geo ? 36.5 + index * 0.01 : null,
    }
  })
}

export const MOCK_SHIFTS: Shift[] = createMockShifts()

function filterShifts(shifts: Shift[], url: URL): Shift[] {
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const employeeCode = url.searchParams.get('employeeCode')
  const status = url.searchParams.get('status')

  return shifts.filter((shift) => {
    if (from && parseShiftDate(shift.date) < parseShiftDate(from)) return false
    if (to && parseShiftDate(shift.date) > parseShiftDate(to)) return false
    if (employeeCode && shift.employeeCode !== employeeCode) return false
    if (status && status !== 'all' && shift.status !== status) return false
    return true
  })
}

export const shiftHandlers = [
  http.get('/api/shifts', async ({ request }) => {
    await delay(500)
    const url = new URL(request.url)
    return HttpResponse.json(filterShifts(MOCK_SHIFTS, url))
  }),

  http.get('/api/shifts/:id', ({ params }) => {
    const shift = MOCK_SHIFTS.find((item) => item.id === params.id)
    if (!shift) {
      return HttpResponse.json({ message: 'Смена не найдена' }, { status: 404 })
    }
    return HttpResponse.json(shift)
  }),

  http.post('/api/shifts', async ({ request }) => {
    const body = (await request.json()) as Partial<Shift>
    const startTime = body.startTime ?? '08:00:00'
    const endTime = body.endTime ?? null
    const status = body.status ?? (endTime ? 'closed' : 'open')
    const { durationRaw, durationRounded } = calcDuration(startTime, endTime)

    const newShift: Shift = {
      id: crypto.randomUUID(),
      date: body.date ?? format(BASE_DATE, 'dd.MM.yyyy'),
      employeeCode: body.employeeCode ?? 'EMP001',
      employeeName: body.employeeName ?? mockEmployees[0].employeeName,
      telegramId: body.telegramId ?? mockEmployees[0].telegramId,
      startTime,
      endTime,
      workType: body.workType ?? WORK_TYPES[0],
      location: body.location ?? LOCATIONS[0],
      equipment: body.equipment ?? EQUIPMENT[0],
      description: body.description ?? '',
      comment: body.comment ?? '',
      status,
      durationRaw,
      durationRounded,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
    }

    MOCK_SHIFTS.push(newShift)
    return HttpResponse.json(newShift, { status: 201 })
  }),

  http.patch('/api/shifts/:id', async ({ params, request }) => {
    const index = MOCK_SHIFTS.findIndex((shift) => shift.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ message: 'Смена не найдена' }, { status: 404 })
    }

    const body = (await request.json()) as Partial<Shift>
    const updatedShift: Shift = { ...MOCK_SHIFTS[index], ...body }
    const { durationRaw, durationRounded } = calcDuration(
      updatedShift.startTime,
      updatedShift.endTime,
    )

    updatedShift.durationRaw = durationRaw
    updatedShift.durationRounded = durationRounded
    if (updatedShift.endTime === null) {
      updatedShift.status = 'open'
    } else if (body.endTime !== undefined) {
      updatedShift.status = 'closed'
    }

    MOCK_SHIFTS[index] = updatedShift
    return HttpResponse.json(updatedShift)
  }),

  http.delete('/api/shifts/:id', ({ params }) => {
    const index = MOCK_SHIFTS.findIndex((shift) => shift.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ message: 'Смена не найдена' }, { status: 404 })
    }

    MOCK_SHIFTS.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
