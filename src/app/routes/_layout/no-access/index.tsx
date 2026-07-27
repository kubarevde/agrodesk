import { createFileRoute, Link } from '@tanstack/react-router'
import { ShieldOff } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useLogout } from '@/features/auth/hooks'

export const Route = createFileRoute('/_layout/no-access/')({
  component: NoAccessPage,
})

function NoAccessPage() {
  const logout = useLogout()

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4">
      <EmptyState
        icon={ShieldOff}
        title="Нет доступных разделов"
        description="Для вашей роли сейчас не открыт ни один рабочий раздел. Обратитесь к администратору организации или выйдите и войдите снова после изменения прав."
        action={{ label: 'Выйти', onClick: () => logout() }}
      />
      <p className="mt-3 text-center text-sm text-muted-foreground">
        <Link to="/profile" className="text-primary underline-offset-2 hover:underline">
          Открыть профиль
        </Link>
      </p>
    </div>
  )
}
