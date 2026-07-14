import { Badge } from '@/components/ui/badge'
import type { CurrentUser } from '@/lib/transformers'
import { getRoleBadgeClass, ROLE_LABELS } from '@/features/employees/utils'

interface ProfileInfoSectionProps {
  user: CurrentUser
}

export function ProfileInfoSection({ user }: ProfileInfoSectionProps) {
  const showRate = user.role === 'admin' || user.role === 'manager'

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold text-foreground">Мои данные</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">ФИО</dt>
          <dd className="text-sm font-medium text-foreground">{user.fullName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Код</dt>
          <dd className="text-sm font-medium text-foreground">{user.employeeCode}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Должность</dt>
          <dd className="text-sm font-medium text-foreground">{user.position || '—'}</dd>
        </div>
        {showRate ? (
          <div>
            <dt className="text-xs text-muted-foreground">Ставка</dt>
            <dd className="text-sm font-medium text-foreground">
              {user.hourlyRate.toLocaleString('ru-RU')} ₽/ч
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Роль</dt>
          <dd>
            <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
              {ROLE_LABELS[user.role]}
            </Badge>
          </dd>
        </div>
      </dl>
    </section>
  )
}
