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
import { OverviewKpiCard } from '@/features/superadmin/components/OverviewKpiCard'
import { PlatformAttentionList } from '@/features/superadmin/components/PlatformAttentionList'
import { PlatformOverviewPanels } from '@/features/superadmin/components/PlatformOverviewPanels'
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
  const statsLoading = statsQuery.isLoading

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
        <div>
          <h1 className="text-2xl font-semibold">Платформа</h1>
          <p className="text-sm text-muted-foreground">
            Superadmin overview — не holding dashboard и не tenant KPI
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-primary text-primary-foreground">
          <Plus className="size-4" />
          Добавить организацию
        </Button>
      </div>

      <SectionHelp section="суперадмин" items={superadminHelp} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statsLoading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <OverviewKpiCard title="Организаций" value={stats.totalOrgs} />
            <OverviewKpiCard title="Активных" value={stats.activeOrgs} />
            <OverviewKpiCard title="Сотрудников" value={stats.totalEmployees} />
            <OverviewKpiCard title="Смен сегодня" value={stats.totalShiftsToday} />
            <OverviewKpiCard title="Тикеты (unread)" value={stats.supportUnread} />
            <OverviewKpiCard
              title="Marketplace org"
              value={stats.marketplaceOrgs}
              hint="Отдельный feature flag"
            />
          </>
        )}
      </div>

      {statsLoading || !stats ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <>
          <PlatformOverviewPanels stats={stats} />
          <PlatformAttentionList items={stats.attention} />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Организации</CardTitle>
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
