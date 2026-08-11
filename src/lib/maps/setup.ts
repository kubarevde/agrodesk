import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import 'react-image-crop/dist/ReactCrop.css'
import 'yet-another-react-lightbox/styles.css'

import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { applyLeafletDrawRussianLocale } from './leafletDrawRu'

// Vite breaks Leaflet's default icon URLs — rebind them once.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

applyLeafletDrawRussianLocale()

// Hide Leaflet brand / regional prefix (e.g. flag) on default attribution control.
L.Control.Attribution.mergeOptions({ prefix: false })

/**
 * Leaflet.Draw mid-edge handles create accidental extra vertices while editing.
 * Field contours only move/delete real corners — disable middle markers once.
 */
function disableLeafletDrawMiddleMarkers() {
  const editNs = (L as unknown as { Edit?: { PolyVerticesEdit?: { prototype: Record<string, unknown> } } })
    .Edit
  const proto = editNs?.PolyVerticesEdit?.prototype
  if (!proto || proto.__agrodeskNoMiddleMarkers) return
  proto._createMiddleMarker = () => undefined
  proto.__agrodeskNoMiddleMarkers = true
}

disableLeafletDrawMiddleMarkers()
