import L from 'leaflet'
import { Check, Pencil, Undo2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { createContourVertexIcons } from '@/lib/maps/contourVertexIcon'
import type { LatLngPair } from '../geometry'
import { normalizePolygon, polygonAreaHa, polygonCentroid } from '../geometry'

const VERTEX_ICONS = createContourVertexIcons()

const POLYGON_STYLE = {
  allowIntersection: false,
  showArea: false,
  icon: VERTEX_ICONS.icon,
  touchIcon: VERTEX_ICONS.touchIcon,
  shapeOptions: {
    color: '#01696F',
    fillColor: '#01696F',
    fillOpacity: 0.25,
    weight: 2,
  },
}

export type ContourDrawApi = {
  start: () => void
  finish: () => void
  undo: () => void
  cancel: () => void
  clear: () => void
  isDrawing: () => boolean
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
  onChange: (next: ContourChange) => void
  onDrawingChange?: (drawing: boolean) => void
}

function layerToPairs(layer: L.Layer): LatLngPair[] | null {
  if (!(layer instanceof L.Polygon)) return null
  const raw = layer.getLatLngs()
  const ring = (Array.isArray(raw[0]) ? raw[0] : raw) as L.LatLng[]
  return normalizePolygon(ring.map((ll) => [ll.lat, ll.lng]))
}

type PolygonDrawer = L.Draw.Polygon & {
  completeShape?: () => void
  deleteLastVertex?: () => void
}

/** Leaflet.Draw toolbar + imperative API for large mobile buttons. */
export function ContourDrawEngine({
  featureGroupRef,
  apiRef,
  onChange,
  onDrawingChange,
}: ContourDrawEngineProps) {
  const map = useMap()
  const drawerRef = useRef<PolygonDrawer | null>(null)

  useEffect(() => {
    const group = featureGroupRef.current
    if (!group) return

    const control = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: POLYGON_STYLE,
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: group,
        remove: true,
        // Runtime leaflet-draw option; omitted from @types/leaflet-draw EditOptions.
        poly: {
          icon: VERTEX_ICONS.icon,
          touchIcon: VERTEX_ICONS.touchIcon,
        },
      } as L.Control.DrawConstructorOptions['edit'],
    })
    map.addControl(control)

    const setDrawing = (value: boolean) => {
      onDrawingChange?.(value)
    }

    const emit = (pairs: LatLngPair[] | null) => {
      if (!pairs) {
        onChange({ polygon: null, syncWeatherPoint: false })
        return
      }
      const [lat, lng] = polygonCentroid(pairs)
      onChange({
        polygon: pairs,
        syncWeatherPoint: true,
        latitude: lat,
        longitude: lng,
        areaHa: polygonAreaHa(pairs),
      })
    }

    const onCreated = (event: L.LeafletEvent) => {
      const created = event as L.DrawEvents.Created
      group.clearLayers()
      group.addLayer(created.layer)
      emit(layerToPairs(created.layer))
      drawerRef.current = null
      setDrawing(false)
    }
    const onEdited = () => {
      let found: LatLngPair[] | null = null
      group.eachLayer((layer) => {
        if (!found) found = layerToPairs(layer)
      })
      emit(found)
    }
    const onDeleted = () => emit(null)
    const onDrawStop = () => {
      drawerRef.current = null
      setDrawing(false)
    }

    map.on(L.Draw.Event.CREATED, onCreated)
    map.on(L.Draw.Event.EDITED, onEdited)
    map.on(L.Draw.Event.DELETED, onDeleted)
    map.on(L.Draw.Event.DRAWSTOP, onDrawStop)

    const api: ContourDrawApi = {
      start: () => {
        drawerRef.current?.disable()
        // DrawMap is a leaflet-draw typing shim; runtime Map is fine.
        const drawer = new L.Draw.Polygon(map as L.DrawMap, POLYGON_STYLE) as PolygonDrawer
        drawerRef.current = drawer
        drawer.enable()
        setDrawing(true)
      },
      finish: () => {
        drawerRef.current?.completeShape?.()
      },
      undo: () => {
        drawerRef.current?.deleteLastVertex?.()
      },
      cancel: () => {
        drawerRef.current?.disable()
        drawerRef.current = null
        setDrawing(false)
      },
      clear: () => {
        drawerRef.current?.disable()
        drawerRef.current = null
        setDrawing(false)
        group.clearLayers()
        emit(null)
      },
      isDrawing: () => drawerRef.current != null,
    }
    apiRef.current = api

    return () => {
      drawerRef.current?.disable()
      drawerRef.current = null
      apiRef.current = null
      map.off(L.Draw.Event.CREATED, onCreated)
      map.off(L.Draw.Event.EDITED, onEdited)
      map.off(L.Draw.Event.DELETED, onDeleted)
      map.off(L.Draw.Event.DRAWSTOP, onDrawStop)
      map.removeControl(control)
    }
  }, [map, featureGroupRef, apiRef, onChange, onDrawingChange])

  return null
}

type ContourDrawToolbarProps = {
  apiRef: React.MutableRefObject<ContourDrawApi | null>
  drawing: boolean
  hasContour: boolean
}

/** Large tap targets for phones — desktop keeps the Leaflet.Draw toolbar. */
export function ContourDrawToolbar({
  apiRef,
  drawing,
  hasContour,
}: ContourDrawToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 sm:hidden">
      {!drawing ? (
        <Button
          type="button"
          className="min-h-11 flex-1"
          onClick={() => apiRef.current?.start()}
        >
          <Pencil className="size-4" />
          Начать рисовать
        </Button>
      ) : (
        <>
          <Button
            type="button"
            className="min-h-11 flex-1"
            onClick={() => apiRef.current?.finish()}
          >
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
        </>
      )}
      {hasContour && !drawing ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          onClick={() => apiRef.current?.clear()}
        >
          Очистить контур
        </Button>
      ) : null}
    </div>
  )
}
