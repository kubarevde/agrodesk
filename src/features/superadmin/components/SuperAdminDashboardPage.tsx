import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { superadminHelp } from '@/features/help/content'
import { OrgModal } from '@/features/superadmin/components/OrgModal'
import { OrganizationsTable } from '@/features/superadmin/components/OrganizationsTable'
import { TempPasswordDialog } from '@/features/superadmin/components/TempPasswordDialog'
import {
  useDeleteOrganization,
  useOrganizations,
  useSuperAdminStats,
  useUpdateOrganization,
} from '@/features/superadmin/hooks'
import type { Organization, OrganizationCreateResult } from '@/features/superadmin/types'

export function SuperAdminDashboardPage() {
  const statsQuery = useSuperAdminStats()
  const orgsQuery = useOrganizations()
  const updateOrg = useUpdateOrganization()
  const deleteOrg = useDeleteOrganization()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Organization | null>(null)
  const [created, setCreated] = useState<OrganizationCreateResult | null>(null)

  const stats = statsQuery.data
  const loading = statsQuery.isLoading || orgsQuery.isLoading

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (org: Organization) => {
    setEditing(org)
    setModalOpen(true)
  }

  const toggleActive = async (org: Organization) => {
    try {
      await updateOrg.mutateAsync({
        id: org.id,
        payload: { isActive: !org.isActive },
      })
      toast.success(org.isActive ? 'Организация заблокирована' : 'Организация активирована')
    } catch {
      toast.error('Не удалось изменить статус')
    }
  }

  const removeOrg = async (org: Organization) => {
    if (!window.confirm(`Заблокировать «${org.name}»? Данные сохранятся.`)) return
    try {
      await deleteOrg.mutateAsync(org.id)
      toast.success('Организация заблокирована')
    } catch {
      toast.error('Не удалось удалить организацию')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Организации</h1>
        <Button type="button" onClick={openCreate} className="bg-primary text-primary-foreground">
          <Plus className="size-4" />
          Добавить организацию
        </Button>
      </div>

      <SectionHelp title="Справка: суперадмин" items={superadminHelp} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard title="Всего орг" value={stats.totalOrgs} />
            <KpiCard title="Активных" value={stats.activeOrgs} />
            <KpiCard title="Trial" value={stats.trialOrgs} />
            <KpiCard title="Сотрудников" value={stats.totalEmployees} />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Список организаций</CardTitle>
        </CardHeader>
        <CardContent>
          {orgsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !orgsQuery.data?.length ? (
            <div className="flex flex-col items-start gap-3 py-8">
              <p className="text-muted-foreground">Организаций пока нет</p>
              <Button type="button" variant="outline" onClick={openCreate}>
                Создать первую
              </Button>
            </div>
          ) : (
            <OrganizationsTable
              organizations={orgsQuery.data}
              onEdit={openEdit}
              onToggleActive={(org) => void toggleActive(org)}
              onDelete={(org) => void removeOrg(org)}
            />
          )}
        </CardContent>
      </Card>

      <OrgModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        organization={editing}
        onCreated={setCreated}
      />
      <TempPasswordDialog result={created} onClose={() => setCreated(null)} />
    </div>
  )
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
