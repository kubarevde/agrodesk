import { Link2, Link2Off, Pencil, Share2, Trash2, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ImplementResponse } from '../types'
import { ImplementCategoryBadge } from './ImplementCategoryBadge'
import { ImplementConditionBadge } from './ImplementConditionBadge'

type ImplementCardProps = {
  item: ImplementResponse
  canManage: boolean
  canDelete: boolean
  onEdit: (item: ImplementResponse) => void
  onAttach: (item: ImplementResponse) => void
  onDetach: (item: ImplementResponse) => void
  onMaintenance: (item: ImplementResponse) => void
  onShare: (item: ImplementResponse) => void
  onDelete: (item: ImplementResponse) => void
}

export function ImplementCard({
  item,
  canManage,
  canDelete,
  onEdit,
  onAttach,
  onDetach,
  onMaintenance,
  onShare,
  onDelete,
}: ImplementCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg font-semibold text-foreground">{item.name}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <ImplementCategoryBadge category={item.category} />
          <ImplementConditionBadge condition={item.condition} />
          {item.current_equipment_name ? (
            <Badge variant="outline">Прикреплено к: {item.current_equipment_name}</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Свободно
            </Badge>
          )}
          {item.sharing_status === 'active' ? (
            <Badge className="bg-success text-primary-foreground hover:bg-success">
              В шеринге
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap gap-2">
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onAttach(item)}>
            <Link2 className="size-3.5" />
            Прикрепить
          </Button>
        ) : null}
        {canManage && item.current_equipment_id ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onDetach(item)}>
            <Link2Off className="size-3.5" />
            Открепить
          </Button>
        ) : null}
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onMaintenance(item)}>
            <Wrench className="size-3.5" />
            ТО
          </Button>
        ) : null}
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onShare(item)}>
            <Share2 className="size-3.5" />
            Шеринг
          </Button>
        ) : null}
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
            <Pencil className="size-3.5" />
            Изменить
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="size-3.5" />
            Удалить
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
