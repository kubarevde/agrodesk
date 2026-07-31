import L from 'leaflet'

/** Hit box vs visible dot — finger-friendly without a bulky square. */
const DESKTOP_HIT = 12
const DESKTOP_DOT = 10
const TOUCH_HIT = 22
const TOUCH_DOT = 12

function buildIcon(hit: number, dot: number): L.DivIcon {
  const pad = Math.max(0, (hit - dot) / 2)
  return L.divIcon({
    className: 'agrodesk-contour-vertex',
    html: `<span class="agrodesk-contour-vertex__dot" style="width:${dot}px;height:${dot}px;margin:${pad}px"></span>`,
    iconSize: [hit, hit],
    iconAnchor: [hit / 2, hit / 2],
  })
}

/** Leaflet.Draw vertex markers for field contour draw/edit. */
export function createContourVertexIcons(): {
  icon: L.DivIcon
  touchIcon: L.DivIcon
} {
  const desktop = buildIcon(DESKTOP_HIT, DESKTOP_DOT)
  const touch = buildIcon(TOUCH_HIT, TOUCH_DOT)
  // On touch browsers Draw/Edit swap to touchIcon before merging options;
  // pass the active size as `icon` so setOptions does not shrink the hit area.
  const active = L.Browser.touch ? touch : desktop
  return { icon: active, touchIcon: touch }
}
