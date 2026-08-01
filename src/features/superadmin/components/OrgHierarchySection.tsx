import { OrgChildrenSection } from '@/features/superadmin/components/OrgChildrenSection'
import { OrgFormSection } from '@/features/superadmin/components/OrgFormSection'
import { useOrgParent } from '@/features/superadmin/hooks'
import { Skeleton } from '@/components/ui/skeleton'

type OrgHierarchySectionProps = {
  orgId: string
  enabled: boolean
}

export function OrgHierarchySection({ orgId, enabled }: OrgHierarchySectionProps) {
  const parentQuery = useOrgParent(orgId, enabled)
  const parent = parentQuery.data

  return (
    <OrgFormSection
      title="Структура холдинга"
      description="Связи head → child отдельно от формы сохранения. Marketplace и tenant settings детей не меняются."
    >
      {parentQuery.isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : parent ? (
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Эта организация — дочерняя КФХ</p>
          <p className="text-sm font-medium text-foreground">
            Головная: {parent.headName}{' '}
            <span className="font-normal text-muted-foreground">({parent.headSlug})</span>
          </p>
          {!parent.headIsActive ? (
            <p className="text-xs text-destructive">Головная организация неактивна</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Отвязка выполняется из карточки головной организации.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Нет головной связи — организация самостоятельная или может стать головной.
        </p>
      )}

      <OrgChildrenSection headOrgId={orgId} enabled={enabled} embedded />
    </OrgFormSection>
  )
}
