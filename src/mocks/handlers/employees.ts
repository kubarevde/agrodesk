import { http, HttpResponse } from 'msw'
import type { Employee } from '@/types'

export const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    employeeCode: 'EMP001',
    employeeName: 'Иванов Сергей Петрович',
    position: 'тракторист',
    telegramId: '184729301',
    hourlyRate: 250,
    role: 'employee',
    isActive: true,
  },
  {
    id: 'emp-002',
    employeeCode: 'EMP002',
    employeeName: 'Петров Алексей Николаевич',
    position: 'комбайнёр',
    telegramId: '295840612',
    hourlyRate: 320,
    role: 'employee',
    isActive: true,
  },
  {
    id: 'emp-003',
    employeeCode: 'EMP003',
    employeeName: 'Сидорова Елена Викторовна',
    position: 'агроном',
    telegramId: '306951723',
    hourlyRate: 350,
    role: 'manager',
    isActive: true,
  },
  {
    id: 'emp-004',
    employeeCode: 'EMP004',
    employeeName: 'Козлов Дмитрий Андреевич',
    position: 'водитель',
    telegramId: '417062834',
    hourlyRate: 220,
    role: 'employee',
    isActive: true,
  },
  {
    id: 'emp-005',
    employeeCode: 'EMP005',
    employeeName: 'Морозов Павел Игоревич',
    position: 'разнорабочий',
    telegramId: '528173945',
    hourlyRate: 180,
    role: 'employee',
    isActive: true,
  },
]

export const employeeHandlers = [
  http.get('/api/employees', () => HttpResponse.json(mockEmployees)),

  http.post('/api/employees', async ({ request }) => {
    const body = (await request.json()) as Partial<Employee>
    const nextIndex = mockEmployees.length + 1
    const employee: Employee = {
      id: crypto.randomUUID(),
      employeeCode: `EMP${String(nextIndex).padStart(3, '0')}`,
      employeeName: body.employeeName ?? '',
      position: body.position ?? '',
      telegramId: body.telegramId ?? '',
      hourlyRate: body.hourlyRate ?? 0,
      role: body.role ?? 'employee',
      isActive: true,
    }
    mockEmployees.push(employee)
    return HttpResponse.json(employee, { status: 201 })
  }),

  http.patch('/api/employees/:id', async ({ params, request }) => {
    const index = mockEmployees.findIndex((employee) => employee.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ message: 'Сотрудник не найден' }, { status: 404 })
    }

    const body = (await request.json()) as Partial<Employee>
    mockEmployees[index] = { ...mockEmployees[index], ...body }
    return HttpResponse.json(mockEmployees[index])
  }),
]
