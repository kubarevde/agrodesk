import { CalendarDays, LayoutList, Plus } from 'lucide-react'
import { useState } from 'react'
import { addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/features/auth/hooks'
import type { AgroPlan, AgroPlanStatus } from '../types'
import { AgroCalendarDaySheet } from './AgroCalendarDaySheet'
import { AgroCalendarListView } from './AgroCalendarListView'
import { AgroCalendarMonthView } from './AgroCalendarMonthView'
import { AgroPlanDetailSheet } from './AgroPlanDetailSheet'
import { AgroPlanFormDialog } from './AgroPlanFormDialog'

export function AgroCalendarPage() {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  const [view, setView] = useState<'month' | 'list'>('month')
  const [month, setMonth] = useState(() => new Date())
  const [fieldId, setFieldId] = useState<string | undefined>()
  const [status, setStatus] = useState<AgroPlanStatus | undefined>()
  const [from, setFrom] = useState<string | undefined>()
  const [to, setTo] = useState<string | undefined>()
  const [selected, setSelected] = useState<AgroPlan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dayKey, setDayKey] = useState<string | null>(null)
  const [dayOpen, setDayOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AgroPlan | null>(null)
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>()

  const openPlan = (plan: AgroPlan) => {
    setSelected(plan)
    setDetailOpen(true)
  }

  const openDay = (key: string) => {
    setDayKey(key)
    setDayOpen(true)
  }

  const openCreateForm = (defaultDate?: string) => {
    setEditingPlan(null)
    setFormDefaultDate(defaultDate)
    setFormOpen(true)
  }

  const openEditForm = (plan: AgroPlan) => {
    setDetailOpen(false)
    setEditingPlan(plan)
    setFormDefaultDate(undefined)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingPlan(null)
    setFormDefaultDate(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Агрокалендарь</h1>
        {canManage ? (
          <Button type="button" onClick={() => openCreateForm()}>
            <Plus className="size-4" />
            Запланировать работу
          </Button>
        ) : null}
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
        <TabsList>
          <TabsTrigger value="month">
            <CalendarDays className="size-3.5" />
            Месяц
          </TabsTrigger>
          <TabsTrigger value="list">
            <LayoutList className="size-3.5" />
            Список
          </TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-4">
          <AgroCalendarMonthView
            month={month}
            fieldId={fieldId}
            onPrevMonth={() => setMonth((current) => subMonths(current, 1))}
            onNextMonth={() => setMonth((current) => addMonths(current, 1))}
            onFieldChange={setFieldId}
            onSelectPlan={openPlan}
            onSelectDay={openDay}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <AgroCalendarListView
            fieldId={fieldId}
            status={status}
            from={from}
            to={to}
            onFieldChange={setFieldId}
            onStatusChange={setStatus}
            onRangeChange={({ from: nextFrom, to: nextTo }) => {
              setFrom(nextFrom)
              setTo(nextTo)
            }}
            onSelectPlan={openPlan}
            onAddPlan={canManage ? () => openCreateForm() : undefined}
          />
        </TabsContent>
      </Tabs>

      <AgroCalendarDaySheet
        day={dayKey}
        fieldId={fieldId}
        open={dayOpen}
        canManage={canManage}
        onClose={() => setDayOpen(false)}
        onSelectPlan={(plan) => {
          setDayOpen(false)
          openPlan(plan)
        }}
        onAddPlan={(day) => {
          setDayOpen(false)
          openCreateForm(day)
        }}
      />

      <AgroPlanDetailSheet
        plan={selected}
        open={detailOpen}
        canManage={canManage}
        onClose={() => setDetailOpen(false)}
        onDeleted={() => setSelected(null)}
        onEdit={openEditForm}
      />

      {canManage ? (
        <AgroPlanFormDialog
          open={formOpen}
          onClose={closeForm}
          plan={editingPlan}
          defaultPlannedDate={formDefaultDate}
        />
      ) : null}
    </div>
  )
}
