import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCloseAgroPlan, useSetAgroPlanStatus } from '../hooks'
import type { AgroPlan, AgroPlanCloseOutcome } from '../types'
import { isOpenPlan } from '../utils'
import { AgroPlanAdminCloseDialog } from './AgroPlanAdminCloseDialog'

type AgroPlanActionsProps = {
  plan: AgroPlan
  canManage: boolean
  isAdmin: boolean
  onChanged?: (plan: AgroPlan) => void
}

/** One-tap status actions + admin force-close. */
export function AgroPlanActions({ plan, canManage, isAdmin, onChanged }: AgroPlanActionsProps) {
  const setStatus = useSetAgroPlanStatus()
  const closePlan = useCloseAgroPlan()
  const [adminOpen, setAdminOpen] = useState(false)
  const [outcome, setOutcome] = useState<AgroPlanCloseOutcome>('done')
  const [note, setNote] = useState('')

  const open = isOpenPlan(plan)
  const pending = setStatus.isPending || closePlan.isPending
  const showManagerActions = canManage && open
  const showAdminClose = isAdmin && plan.entryKind === 'plan'

  if (!showManagerActions && !showAdminClose) return null

  const applyManager = async (status: AgroPlanCloseOutcome) => {
    const updated = await setStatus.mutateAsync({ id: plan.id, status })
    onChanged?.(updated)
  }

  const applyAdminClose = async () => {
    const updated = await closePlan.mutateAsync({
      id: plan.id,
      status: outcome,
      note: note.trim() || undefined,
    })
    setAdminOpen(false)
    setNote('')
    onChanged?.(updated)
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {showManagerActions ? (
          <>
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={() => void applyManager('done')}
            >
              <CheckCircle2 className="size-4" />
              Отметить выполненным
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => void applyManager('cancelled')}
            >
              <XCircle className="size-4" />
              Отменить задачу
            </Button>
          </>
        ) : null}
        {showAdminClose ? (
          <Button
            type="button"
            variant={showManagerActions ? 'secondary' : 'default'}
            className="w-full"
            disabled={pending}
            onClick={() => {
              setOutcome('done')
              setAdminOpen(true)
            }}
          >
            Закрыть задачу (админ)
          </Button>
        ) : null}
      </div>
      <AgroPlanAdminCloseDialog
        plan={plan}
        open={adminOpen}
        pending={closePlan.isPending}
        outcome={outcome}
        note={note}
        onOpenChange={setAdminOpen}
        onOutcomeChange={setOutcome}
        onNoteChange={setNote}
        onConfirm={() => void applyAdminClose()}
      />
    </>
  )
}
