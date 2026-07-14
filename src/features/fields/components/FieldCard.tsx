import { Clock, Pencil, Share2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FieldResponse } from '../types'

type FieldCardProps = {
  field: FieldResponse
  canManage: boolean
  canDelete: boolean
  onEdit: (field: FieldResponse) => void
  onShare: (field: FieldResponse) => void
  onDelete: (field: FieldResponse) => void
}

export function FieldCard({
  field,
  canManage,
  canDelete,
  onEdit,
  onShare,
  onDelete,
}: FieldCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-foreground">{field.name}</CardTitle>
          {field.crop_type ? <Badge variant="secondary">{field.crop_type}</Badge> : null}
        </div>
        {field.sharing_status === 'active' ? (
          <Badge className="w-fit bg-success text-primary-foreground hover:bg-success">
            В шеринге
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="space-y-1 text-sm text-muted-foreground">
          {field.area_ha != null ? <p>{field.area_ha} га</p> : null}
          {field.soil_type ? <p>{field.soil_type}</p> : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.assign(`/worktime?field_id=${field.id}`)
              }}
            >
              <Clock className="size-3.5" />
              Смены
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(field)}>
              <Pencil className="size-3.5" />
              Редактировать
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onShare(field)}>
              <Share2 className="size-3.5" />
              Шеринг
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => onDelete(field)}
            >
              <Trash2 className="size-3.5" />
              Удалить
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
