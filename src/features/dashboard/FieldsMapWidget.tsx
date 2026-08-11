import { useMemo, useState } from 'react'
import { Maximize2, MapPinned } from 'lucide-react'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEquipment } from '@/features/equipment/hooks'
import { useFields, useSeasonPlantingOverlays } from '@/features/fields/hooks'
import {
  AgroMap,
  buildEquipmentOverlay,
  buildFieldOverlay,
  buildLocationsOverlay,
} from '@/features/maps'
import { useLocations } from '@/features/worktime/referenceHooks'

export function FieldsMapWidget() {
  const [expanded, setExpanded] = useState(false)
  const { data: fields = [], isLoading: fieldsLoading } = useFields()
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipment({
    is_active: true,
  })
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const { data: plantings = [], isLoading: plantingsLoading } = useSeasonPlantingOverlays()

  const overlays = useMemo(() => {
    const activeFields = fields.filter((field) => field.is_active)
    return [
      buildFieldOverlay(activeFields, { includeWeatherMarkers: false, plantings }),
      buildEquipmentOverlay(equipment),
      buildLocationsOverlay(locations),
    ]
  }, [equipment, fields, locations, plantings])

  const hasData = overlays.some(
    (overlay) =>
      (overlay.markers?.length ?? 0) > 0 || (overlay.polygons?.length ?? 0) > 0,
  )

  if (fieldsLoading || equipmentLoading || locationsLoading || plantingsLoading) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Карта хозяйства</h2>
        <PageSkeleton />
      </section>
    )
  }

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Карта хозяйства</h2>
        {hasData ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0 gap-1.5 sm:min-h-8"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="size-4" aria-hidden />
            На весь экран
          </Button>
        ) : null}
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <MapPinned className="size-4 shrink-0" />
            Нет полей, техники или мест работы с координатами для отображения на карте
          </CardContent>
        </Card>
      ) : expanded ? (
        <div className="h-[220px] min-h-[180px] rounded-lg border border-border bg-muted/40" aria-hidden />
      ) : (
        <AgroMap
          overlays={overlays}
          height="220px"
          className="min-h-[180px]"
          showOverlayToggles
          defaultBasemap="satellite"
          zoom={11}
        />
      )}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="fixed top-3 right-3 bottom-5 left-3 z-[1200] flex h-auto max-h-none w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-2 overflow-hidden rounded-xl p-3 sm:max-w-none"
          overlayClassName="z-[1200] bg-background/80"
        >
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle>Карта хозяйства</DialogTitle>
          </DialogHeader>
          {expanded ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <AgroMap
                overlays={overlays}
                fill
                showOverlayToggles
                showSearch
                defaultBasemap="satellite"
                zoom={11}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
