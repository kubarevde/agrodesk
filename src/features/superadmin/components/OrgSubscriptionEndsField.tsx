import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { OrgFormValues } from '@/features/superadmin/schemas'
import { orgPlanLabel } from '@/features/superadmin/plans'

type OrgSubscriptionEndsFieldProps = {
  control: Control<OrgFormValues>
  plan: OrgFormValues['plan']
}

/**
 * UI for organizations.trial_ends_at — subscription end date for any plan.
 * Column name is historical (trial); value is not cleared when plan changes.
 */
export function OrgSubscriptionEndsField({ control, plan }: OrgSubscriptionEndsFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Истекает</Label>
      <Controller
        name="trialEndsAt"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm">
                <CalendarIcon className="size-4 text-muted-foreground" />
                {field.value
                  ? format(parseISO(field.value), 'dd MMMM yyyy', { locale: ru })
                  : 'Не указано'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={ru}
                  selected={field.value ? parseISO(field.value) : undefined}
                  onSelect={(date) =>
                    field.onChange(date ? format(date, 'yyyy-MM-dd') : null)
                  }
                />
              </PopoverContent>
            </Popover>
            {field.value ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => field.onChange(null)}
              >
                Очистить дату
              </button>
            ) : null}
          </div>
        )}
      />
      <p className="text-xs text-muted-foreground">
        Дата окончания подписки для плана «{orgPlanLabel(plan)}». Необязательно.
        Сейчас используется для контроля в панели суперадмина; вход не блокируется
        автоматически по этой дате — только флагом «Организация активна».
      </p>
    </div>
  )
}
