import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { useCurrentUser } from '@/features/auth/hooks'
import { EmployeeMyShiftView } from '@/features/auth/EmployeeMyShiftView'
import { ManagerMyShiftView } from '@/features/auth/ManagerMyShiftView'

export function MyShiftPage({ embedded = false }: { embedded?: boolean }) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return <SkeletonTable rows={4} columns={2} />
  }

  if (user.role === 'employee') {
    return <EmployeeMyShiftView user={user} embedded={embedded} />
  }

  return <ManagerMyShiftView embedded={embedded} />
}
