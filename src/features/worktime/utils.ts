import { endOfMonth, format, startOfMonth } from 'date-fns'
import type { Shift } from '@/types'

export function getDefaultMonthRange() {
  const now = new Date()
  return {
    from: format(startOfMonth(now), 'dd.MM.yyyy'),
    to: format(endOfMonth(now), 'dd.MM.yyyy'),
  }
}

export function parseApiDate(date: string): Date {
  const [day, month, year] = date.split('.').map(Number)
  return new Date(year, month - 1, day)
}

export function formatApiDate(date: Date): string {
  return format(date, 'dd.MM.yyyy')
}

export const SHIFT_TIME_SLOTS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2)
  const minutes = (index % 2) * 30
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
})

export function toShiftTimeValue(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

export function calcShiftDurationMinutes(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): number {
  const start = parseShiftTime(toShiftTimeValue(startTime), startDate)
  const end = parseShiftTime(toShiftTimeValue(endTime), endDate)
  return Math.floor((end.getTime() - start.getTime()) / 60000)
}

export function formatShiftTime(time: string | null): string {
  if (!time) return '—'
  return time.slice(0, 5)
}

export function parseShiftTime(startTime: string, date?: string): Date {
  const [hours, minutes, seconds = 0] = startTime.split(':').map(Number)
  const base = date ? parseApiDate(date) : new Date()
  base.setHours(hours, minutes, seconds, 0)
  return base
}

export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} ч ${minutes} мин`
}

export function calcDurationRoundedHours(totalMinutes: number): number {
  return Math.ceil(Math.max(0, totalMinutes) / 30) * 0.5
}

export function previewShiftRoundedHours(startTime: string, date?: string): number {
  const elapsedMs = Date.now() - parseShiftTime(startTime, date).getTime()
  const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000))
  return calcDurationRoundedHours(totalMinutes)
}

export function formatShiftDuration(shift: Shift): string {
  if (shift.status === 'closed' && shift.durationRounded != null) {
    return `${shift.durationRounded} ч`
  }
  return '—'
}

export function calcLiveHours(shift: Shift): number {
  const [hours, minutes] = shift.startTime.split(':').map(Number)
  const start = parseApiDate(shift.date)
  start.setHours(hours, minutes, 0, 0)
  const diffMinutes = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000))
  return Math.round((diffMinutes / 60) * 2) / 2
}

export function calcTotalHours(shifts: Shift[]): number {
  return shifts.reduce((sum, shift) => {
    if (shift.status === 'closed' && shift.durationRounded != null) {
      return sum + shift.durationRounded
    }
    if (shift.status === 'open') {
      return sum + calcLiveHours(shift)
    }
    return sum
  }, 0)
}
