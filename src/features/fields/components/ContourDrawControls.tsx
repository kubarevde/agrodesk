import L from 'leaflet'
import { Check, Pencil, SquarePen, Undo2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { createContourVertexIcons } from '@/lib/maps/contourVertexIcon'
import type { LatLngPair } from '../geometry'
import { normalizePolygon, polygonAreaHa, polygonCentroid } from '../geometry'

const VERTEX_ICONS = createContourVertexIcons()

export type ContourMode = 'idle' | 'draw' | 'edit'

export type ContourDrawApi = {
  startDraw: () => void
  startEdit: () => void
  finish: () => void
  undo: () => void
  cancel: () => void
  clear: () => void
  /** Push current FeatureGroup geometry into form state (call before dialog save). */
  flush: () => LatLngPair[] | null
  mode: () => ContourMode
}

type ContourChange = {
  polygon: LatLngPair[] | null
  syncWeatherPoint: boolean
  latitude?: number
  longitude?: number
  areaHa?: number
}

type ContourDrawEngineProps = {
  featureGroupRef: React.MutableRefObject<L.FeatureGroup | null>
  apiRef: React.MutableRefObject<ContourDrawApi | null>
  /** Form polygon — synced into the FeatureGroup when idle (no React Polygon duplicate). */
  polygon: LatLngPair[] | null
  /** Stroke/fill color for draw + idle polygon (default primary). */
  pathColor?: string
  onChange: (next: ContourChange) => void
  onModeChange?: (mode: ContourMode) => void
}

function pathStyleFor(color: string) {
  return {
    color,
    fillColor: color,
    fillOpacity: 0.25,
    weight: 2,
  }
}

function polygonDrawOptions(color: string) {
  return {
    allowIntersection: false,
    showArea: false,
    icon: VERTEX_ICONS.icon,
    touchIcon: VERTEX_ICONS.touchIcon,
    shapeOptions: pathStyleFor(color),
  }
}

function syncGroupPolygon(
  group: L.FeatureGroup,
  polygon: LatLngPair[] | null,
  color: string,
) {
  group.clearLayers()
  if (!polygon || polygon.length < 3) return
  group.addLayer(L.polygon(polygon, pathStyleFor(color)))
}

function layerToPairs(layer: L.Layer): LatLngPair[] | null {
  if (!(layer instanceof L.Polygon)) return null
  const raw = layer.getLatLngs()
  const ring = (Array.isArray(raw[0]) ? raw[0] : raw) as L.LatLng[]
  return normalizePolygon(ring.map((ll) => [ll.lat, ll.lng]))
}

function firstPolygonInGroup(group: L.FeatureGroup): L.Polygon | null {
  let found: L.Polygon | null = null
  group.eachLayer((layer) => {
    if (!found && layer instanceof L.Polygon) found = layer
  })
  return found
}

function readGroupPolygon(group: L.FeatureGroup): LatLngPair[] | null {
  const layer = firstPolygonInGroup(group)
  return layer ? layerToPairs(layer) : null
}

type PolygonDrawer = L.Draw.Polygon & {
  completeShape?: () => void
  deleteLastVertex?: () => void
}

type EditHandler = {
  enable: () => void
  disable: () => void
  enabled: () => boolean
  save?: () => void
  revertLayers?: () => void
}

/**
 * Draw = new contour only. Edit = move/delete existing vertices (no mid-edge points).
 * Geometry is emitted on create / vertex change / finish so dialog Save always has fresh data.
 */
export function ContourDrawEngine({
  featureGroupRef,
  apiRef,
  polygon,
  pathColor = '#01696F',
  onChange,
  onModeChange,
}: ContourDrawEngineProps) {
  const map = useMap()
  const drawerRef = useRef<PolygonDrawer | null>(null)
  const editHandlerRef = useRef<EditHandler | null>(null)
  const modeRef = useRef<ContourMode>('idle')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const polygonRef = useRef(polygon)
  polygonRef.current = polygon
  const pathColorRef = useRef(pathColor)
  pathColorRef.current = pathColor

  useEffect(() => {
    const group = featureGroupRef.current
    if (!group) return

    const setMode = (next: ContourMode) => {
      modeRef.current = next
      onModeChange?.(next)
    }

    const emit = (pairs: LatLngPair[] | null, syncWeatherPoint = true) => {
      if (!pairs) {
        onChangeRef.current({ polygon: null, syncWeatherPoint: false })
        return
      }
      const [lat, lng] = polygonCentroid(pairs)
      onChangeRef.current({
        polygon: pairs,
        syncWeatherPoint,
        latitude: lat,
        longitude: lng,
        areaHa: polygonAreaHa(pairs),
      })
    }

    const emitFromGroup = () => emit(readGroupPolygon(group))

    const stopDraw = () => {
      drawerRef.current?.disable()
      drawerRef.current = null
    }

    const stopEdit = (commit: boolean) => {
      const handler = editHandlerRef.current
      if (!handler) return
      if (commit) handler.save?.()
      else handler.revertLayers?.()
      handler.disable()
      editHandlerRef.current = null
    }

    // Seed group once from form (React Polygon is not used — avoids duplicate layers).
    syncGroupPolygon(group, polygonRef.current, pathColorRef.current)

    const onCreated = (event: L.LeafletEvent) => {
      const created = event as L.DrawEvents.Created
      stopDraw()
      group.clearLayers()
      const layer = created.layer
      if (layer instanceof L.Polygon) {
        layer.setStyle(pathStyleFor(pathColorRef.current))
      }
      group.addLayer(layer)
      emit(layerToPairs(layer))
      setMode('idle')
    }

    const onEditVertex = () => {
      if (modeRef.current !== 'edit') return
      emitFromGroup()
    }

    const onEdited = () => {
      emitFromGroup()
    }

    const onDeleted = () => {
      emit(null)
      setMode('idle')
    }

    const onDrawStop = () => {
      if (modeRef.current === 'draw') {
        stopDraw()
        // Restore previous contour if user cancelled mid-draw.
        if (!readGroupPolygon(group) && polygonRef.current) {
          syncGroupPolygon(group, polygonRef.current, pathColorRef.current)
        }
        setMode('idle')
      }
    }

    map.on(L.Draw.Event.CREATED, onCreated)
    map.on(L.Draw.Event.EDITVERTEX, onEditVertex)
    map.on(L.Draw.Event.EDITED, onEdited)
    map.on(L.Draw.Event.DELETED, onDeleted)
    map.on(L.Draw.Event.DRAWSTOP, onDrawStop)

    const api: ContourDrawApi = {
      startDraw: () => {
        stopEdit(false)
        stopDraw()
        group.clearLayers()
        const drawer = new L.Draw.Polygon(map as L.DrawMap, polygonDrawOptions(pathColorRef.current)) as PolygonDrawer
        drawerRef.current = drawer
        drawer.enable()
        setMode('draw')
      },
      startEdit: () => {
        stopDraw()
        stopEdit(false)
        if (!firstPolygonInGroup(group)) {
          if (polygonRef.current) syncGroupPolygon(group, polygonRef.current, pathColorRef.current)
        }
        if (!firstPolygonInGroup(group)) return

        // Programmatic edit handler — no Leaflet.Draw toolbar Save required.
        const EditToolbarEdit = (
          L as unknown as {
            EditToolbar: { Edit: new (map: L.Map, options: object) => EditHandler }
          }
        ).EditToolbar.Edit
        const handler = new EditToolbarEdit(map, {
          featureGroup: group,
          selectedPathOptions: {
            dashArray: '8, 8',
            maintainColor: true,
          },
          poly: {
            icon: VERTEX_ICONS.icon,
            touchIcon: VERTEX_ICONS.touchIcon,
          },
        })
        editHandlerRef.current = handler
        handler.enable()
        setMode('edit')
      },
      finish: () => {
        if (modeRef.current === 'draw') {
          drawerRef.current?.completeShape?.()
          return
        }
        if (modeRef.current === 'edit') {
          stopEdit(true)
          emitFromGroup()
          setMode('idle')
        }
      },
      undo: () => {
        drawerRef.current?.deleteLastVertex?.()
      },
      cancel: () => {
        if (modeRef.current === 'draw') {
          stopDraw()
          syncGroupPolygon(group, polygonRef.current, pathColorRef.current)
          setMode('idle')
          return
        }
        if (modeRef.current === 'edit') {
          stopEdit(false)
          syncGroupPolygon(group, polygonRef.current, pathColorRef.current)
          setMode('idle')
        }
      },
      clear: () => {
        stopDraw()
        stopEdit(false)
        group.clearLayers()
        emit(null)
        setMode('idle')
      },
      flush: () => {
        if (modeRef.current === 'edit') {
          stopEdit(true)
          setMode('idle')
        }
        const pairs = readGroupPolygon(group)
        emit(pairs)
        return pairs
      },
      mode: () => modeRef.current,
    }
    apiRef.current = api

    return () => {
      stopDraw()
      stopEdit(false)
      apiRef.current = null
      map.off(L.Draw.Event.CREATED, onCreated)
      map.off(L.Draw.Event.EDITVERTEX, onEditVertex)
      map.off(L.Draw.Event.EDITED, onEdited)
      map.off(L.Draw.Event.DELETED, onDeleted)
      map.off(L.Draw.Event.DRAWSTOP, onDrawStop)
    }
  }, [map, featureGroupRef, apiRef, onModeChange])

  // Keep FeatureGroup in sync when form polygon / color changes while idle.
  useEffect(() => {
    const group = featureGroupRef.current
    if (!group || modeRef.current !== 'idle') return
    const current = readGroupPolygon(group)
    const nextKey = polygon?.map((p) => p.join(',')).join('|') ?? ''
    const curKey = current?.map((p) => p.join(',')).join('|') ?? ''
    if (nextKey === curKey) {
      const poly = firstPolygonInGroup(group)
      if (poly) poly.setStyle(pathStyleFor(pathColor))
      return
    }
    syncGroupPolygon(group, polygon, pathColor)
  }, [polygon, pathColor, featureGroupRef])

  return null
}

type ContourDrawToolbarProps = {
  apiRef: React.MutableRefObject<ContourDrawApi | null>
  mode: ContourMode
  hasContour: boolean
}

/** Large tap targets — used on mobile and desktop (Leaflet.Draw toolbar stays hidden). */
export function ContourDrawToolbar({
  apiRef,
  mode,
  hasContour,
}: ContourDrawToolbarProps) {
  if (mode === 'draw') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11 flex-1" onClick={() => apiRef.current?.finish()}>
          <Check className="size-4" />
          Завершить
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => apiRef.current?.undo()}
        >
          <Undo2 className="size-4" />
          Точка
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => apiRef.current?.cancel()}
        >
          <X className="size-4" />
          Отмена
        </Button>
      </div>
    )
  }

  if (mode === 'edit') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11 flex-1" onClick={() => apiRef.current?.finish()}>
          <Check className="size-4" />
          Готово
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => apiRef.current?.cancel()}
        >
          <X className="size-4" />
          Отмена
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        className="min-h-11 flex-1"
        onClick={() => apiRef.current?.startDraw()}
      >
        <Pencil className="size-4" />
        {hasContour ? 'Перерисовать' : 'Начать рисовать'}
      </Button>
      {hasContour ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1"
          onClick={() => apiRef.current?.startEdit()}
        >
          <SquarePen className="size-4" />
          Изменить контур
        </Button>
      ) : null}
      {hasContour ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => apiRef.current?.clear()}
        >
          Очистить контур
        </Button>
      ) : null}
    </div>
  )
}
