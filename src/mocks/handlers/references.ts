import { http, HttpResponse } from 'msw'
import type { Equipment, Location, WorkType } from '@/types'
import { mockEmployees } from './employees'

const mockLocations: Location[] = [
  { id: 'loc-001', name: 'Поле №1', description: 'Пшеница', isActive: true },
  { id: 'loc-002', name: 'Поле №2', description: 'Подсолнечник', isActive: true },
  { id: 'loc-003', name: 'Поле №3', description: 'Кукуруза', isActive: true },
  { id: 'loc-004', name: 'Поле №4', description: 'Озимые', isActive: true },
  { id: 'loc-005', name: 'Зернохранилище', isActive: true },
  { id: 'loc-006', name: 'Мастерская', isActive: true },
  { id: 'loc-007', name: 'Административный корпус', isActive: true },
]

const mockWorkTypes: WorkType[] = [
  { id: 'wt-001', name: 'Посев', category: 'полевые работы', isActive: true },
  { id: 'wt-002', name: 'Уборка урожая', category: 'полевые работы', isActive: true },
  { id: 'wt-003', name: 'Культивация', category: 'полевые работы', isActive: true },
  { id: 'wt-004', name: 'Боронование', category: 'полевые работы', isActive: true },
  { id: 'wt-005', name: 'Опрыскивание', category: 'полевые работы', isActive: true },
  { id: 'wt-006', name: 'Ремонт техники', category: 'обслуживание', isActive: true },
  { id: 'wt-007', name: 'Разгрузка/погрузка', category: 'логистика', isActive: true },
  { id: 'wt-008', name: 'Полив', category: 'полевые работы', isActive: true },
]

const mockEquipment: Equipment[] = [
  { id: 'eq-001', name: 'МТЗ-82', type: 'трактор', isActive: true },
  { id: 'eq-002', name: 'К-700', type: 'трактор', isActive: true },
  { id: 'eq-003', name: 'Дон-1500', type: 'комбайн', isActive: true },
  { id: 'eq-004', name: 'Газель', type: 'грузовик', isActive: true },
  { id: 'eq-005', name: 'КамАЗ', type: 'грузовик', isActive: true },
  { id: 'eq-006', name: 'Опрыскиватель Jacto', type: 'опрыскиватель', isActive: true },
  { id: 'eq-007', name: 'Культиватор КПС-4', type: 'культиватор', isActive: true },
  { id: 'eq-008', name: 'Сеялка СЗ-3.6', type: 'сеялка', isActive: true },
]

export const referenceHandlers = [
  http.get('/api/locations', () => HttpResponse.json(mockLocations)),
  http.get('/api/work-types', () => HttpResponse.json(mockWorkTypes)),
  http.get('/api/equipment', () => HttpResponse.json(mockEquipment)),
  http.get('/api/employees', () => HttpResponse.json(mockEmployees)),
]
