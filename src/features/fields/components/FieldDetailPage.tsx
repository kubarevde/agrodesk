import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, MapPinned } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  useCreateFieldPlanting,
  useFieldPlantings,
  useFieldPlantingsSummary,
  useUpdateFieldPlanting,
} from '../plantingHooks'
import { useCreateRotationPlan, useFieldRotationMatrix } from '../rotationHooks'
import { useFieldDetail } from '../hooks'
import type { FieldPlanting } from '../plantingTypes'
import type { FieldResponse } from '../types'
import { FieldPlantingFormPanel } from './FieldPlantingFormPanel'
import { FieldPlantingHistory } from './FieldPlantingHistory'
import { FieldPlantingsPanel } from './FieldPlantingsPanel'
import { FieldRotationPanel } from './FieldRotationPanel'

type FieldDetailPageProps = {
  fieldId: string
  openAddPlanting?: boolean
}

export function FieldDetailPage({ fieldId, openAddPlanting = false }: FieldDetailPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const seasonYear = new Date().getFullYear()

  const { data: fieldRaw, isLoading, isError } = useFieldDetail(fieldId)
  const field = fieldRaw as FieldResponse | undefined

  const [tab, setTab] = useState('crops')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FieldPlanting | null>(null)

  useEffect(() => {
    setTab('crops')
    setFormOpen(false)
    setEditing(null)
  }, [fieldId])

  useEffect(() => {
    if (!openAddPlanting || !canManage) return
    setTab('crops')
    setEditing(null)
    setFormOpen(true)
    void navigate({
      to: '/fields/$fieldId',
      params: { fieldId },
      search: { addPlanting: undefined },
      replace: true,
    })
  }, [openAddPlanting, canManage, fieldId, navigate])

  const { data: summary } = useFieldPlantingsSummary(fieldId, seasonYear)
  const { data: seasonPlantings = [], isLoading: seasonLoading } = useFieldPlantings(fieldId, {
    seasonYear,
    includeHarvest: true,
  })
  const { data: allPlantings = [], isLoading: historyLoading } = useFieldPlantings(fieldId, {
    includeCancelled: true,
    includeHarvest: true,
    enabled: tab === 'history',
  })
  const { data: rotation, isLoading: rotationLoading } = useFieldRotationMatrix(fieldId, {
    enabled: tab === 'rotation',
  })
  const createPlanting = useCreateFieldPlanting(fieldId)
  const updatePlanting = useUpdateFieldPlanting(fieldId)
  const createPlan = useCreateRotationPlan(fieldId)

  if (isLoading) return <PageSkeleton />
  if (isError || !field) {
    return (
      <EmptyState
        icon={MapPinned}
        title="Поле не найдено"
        description="Проверьте ссылку или вернитесь к списку."
        action={{ label: 'К списку', onClick: () => void navigate({ to: '/fields' }) }}
      />
    )
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const otherPlantings = seasonPlantings.filter(
    (p) => p.status !== 'cancelled' && (!editing || p.id !== editing.id),
  )

  return (
    <div className="space-y-4 overflow-x-hidden">
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 gap-2 px-0 text-muted-foreground sm:min-h-10"
        onClick={() => void navigate({ to: '/fields' })}
      >
        <ArrowLeft className="size-4" />
        К списку полей
      </Button>

      <div className="space-y-1">
        <h1 className="break-words text-2xl font-semibold text-foreground">{field.name}</h1>
        <p className="text-sm text-muted-foreground">
          Культуры сезона, севооборот и прошлые посевы.
          {field.area_ha != null ? ` Площадь поля: ${field.area_ha} га.` : ''}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        <TabsList className="grid h-11 w-full grid-cols-3 group-data-horizontal/tabs:!h-11 sm:h-10 sm:max-w-md sm:group-data-horizontal/tabs:!h-10">
          <TabsTrigger value="crops" className="min-h-10 px-1 text-xs sm:px-1.5 sm:text-sm">
            Культуры
          </TabsTrigger>
          <TabsTrigger value="rotation" className="min-h-10 px-1 text-xs sm:px-1.5 sm:text-sm">
            Севооборот
          </TabsTrigger>
          <TabsTrigger value="history" className="min-h-10 px-1 text-xs sm:px-1.5 sm:text-sm">
            Прошлые сезоны
          </TabsTrigger>
        </TabsList>
        <TabsContent value="crops" className="mt-3 space-y-3">
          {formOpen ? (
            <FieldPlantingFormPanel
              field={field}
              editing={editing}
              otherPlantings={otherPlantings}
              remainingHa={summary?.remainingHa ?? null}
              defaultSeasonYear={seasonYear}
              pending={createPlanting.isPending || updatePlanting.isPending}
              onCancel={closeForm}
              onSubmit={(payload) => {
                void (async () => {
                  try {
                    if (editing) {
                      const patch: Parameters<typeof updatePlanting.mutateAsync>[0] = {
                        id: editing.id,
                        area_ha: payload.area_ha,
                        planted_at: payload.planted_at,
                        status: payload.status,
                        season_year: payload.season_year,
                        comment: payload.comment,
                        polygon: payload.polygon,
                        map_color: payload.map_color,
                      }
                      if (!editing.cropLocked) {
                        patch.crop_code = payload.crop_code
                        patch.variety_id = payload.variety_id
                        patch.clear_variety = payload.clear_variety
                      }
                      if (payload.occupies_whole_field) {
                        patch.occupies_whole_field = true
                      }
                      await updatePlanting.mutateAsync(patch)
                    } else {
                      await createPlanting.mutateAsync(payload)
                    }
                    closeForm()
                  } catch {
                    // toast via mutation
                  }
                })()
              }}
            />
          ) : (
            <FieldPlantingsPanel
              plantings={seasonPlantings}
              summary={summary}
              isLoading={seasonLoading}
              canManage={canManage}
              onAdd={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              onEdit={(row) => {
                setEditing(row)
                setFormOpen(true)
              }}
              onCancel={(row) => {
                void updatePlanting.mutateAsync({
                  id: row.id,
                  crop_code: row.cropCode,
                  season_year: row.seasonYear,
                  area_ha: row.areaHa,
                  status: 'cancelled',
                })
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="rotation" className="mt-3">
          <FieldRotationPanel
            matrix={rotation}
            isLoading={rotationLoading}
            canManage={canManage}
            pending={createPlan.isPending}
            onCreatePlan={(payload) => {
              void createPlan.mutateAsync(payload)
            }}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-3">
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка истории…</p>
          ) : (
            <FieldPlantingHistory plantings={allPlantings} currentSeasonYear={seasonYear} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
