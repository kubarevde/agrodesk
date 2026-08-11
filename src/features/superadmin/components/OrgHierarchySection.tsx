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
      description="Связь головная → дочерняя (head → child) нужна для обзора холдинга. Она не влияет на доступ к маркетплейсу и не меняет параметры кабинета дочерних организаций (часовой пояс, справочники, права)."
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
        <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2">
          <p className="text-sm font-medium text-foreground">Нет головной связи</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Организация не привязана к головной: она самостоятельная или может стать
            головной и иметь дочерние КФХ. Это не означает отключение маркетплейса и не
            меняет настройки её кабинета.
          </p>
        </div>
      )}

      <OrgChildrenSection headOrgId={orgId} enabled={enabled} embedded />
    </OrgFormSection>
  )
}
