import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Wrench } from 'lucide-react'
import { AssetExpensesSection } from '@/components/shared/AssetExpensesSection'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { implementsHelp } from '@/features/help/content'
import { RepairHistorySection } from '@/features/repair-journal/components/RepairHistorySection'
import {
  useImplementDetail,
  useUpdateImplement,
} from '../hooks'
import type { ImplementFormValues } from '../schemas'
import { ImplementDetailHeader } from './ImplementDetailHeader'
import { ImplementFormDialog } from './ImplementFormDialog'
import { ImplementMaintenanceModal } from './ImplementMaintenanceModal'
import { ImplementMaintenanceSection } from './ImplementMaintenanceSection'
import { ImplementSharingModal } from './ImplementSharingModal'
import { ImplementUsageLogModal } from './ImplementUsageLogModal'
import { ImplementUsageLogsSection } from './ImplementUsageLogsSection'

type ImplementDetailPageProps = {
  implementId: string
}

export function ImplementDetailPage({ implementId }: ImplementDetailPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  const { data: item, isLoading, isError } = useImplementDetail(implementId)
  const updateItem = useUpdateImplement()

  const [editOpen, setEditOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  const [usageOpen, setUsageOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  if (isLoading) return <PageSkeleton />
  if (isError || !item) {
    return (
      <EmptyState
        icon={Wrench}
        title="Приспособление не найдено"
        description="Вернитесь к списку приспособлений."
        action={{ label: 'К списку', onClick: () => void navigate({ to: '/implements' }) }}
      />
    )
  }

  const handleSubmit = async (values: ImplementFormValues) => {
    await updateItem.mutateAsync({ id: item.id, values })
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-0 text-muted-foreground"
        onClick={() => void navigate({ to: '/implements' })}
      >
        <ArrowLeft className="size-4" />
        К списку
      </Button>

      <ImplementDetailHeader
        item={item}
        canManage={canManage}
        onEdit={() => setEditOpen(true)}
        onMaintenance={() => setToOpen(true)}
        onUsageLog={() => setUsageOpen(true)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ImplementUsageLogsSection
          implementId={item.id}
          canManage={canManage}
          onAdd={() => setUsageOpen(true)}
        />
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-foreground">Шеринг</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">
              {item.sharing_status === 'active' ? 'В шеринге' : 'Нет активного объявления'}
            </Badge>
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-10"
                onClick={() => setShareOpen(true)}
              >
                Выставить в шеринг
              </Button>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ImplementMaintenanceSection
          implementId={item.id}
          canManage={canManage}
          onAdd={() => setToOpen(true)}
        />
        <RepairHistorySection implementId={item.id} canManage={canManage} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AssetExpensesSection implementId={item.id} canManage={canManage} />
      </div>

      <SectionHelp section="приспособление" items={implementsHelp} />

      <ImplementFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={item}
        isPending={updateItem.isPending}
        onSubmit={handleSubmit}
      />
      <ImplementMaintenanceModal
        open={toOpen}
        onOpenChange={setToOpen}
        item={item}
      />
      <ImplementUsageLogModal
        open={usageOpen}
        onOpenChange={setUsageOpen}
        implementId={item.id}
      />
      <ImplementSharingModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        item={item}
      />
    </div>
  )
}
