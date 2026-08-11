"""Field polygon helpers: validate, centroid (weather point), approximate area."""

from __future__ import annotations

import math
from typing import Any

from fastapi import HTTPException, status

# Technical floor for accidental click polygons (sharing partial plots, etc.).
MIN_POLYGON_AREA_HA = 0.01


def normalize_polygon(raw: Any) -> list[list[float]] | None:
    """Return [[lat, lon], ...] with ≥3 vertices, or None if empty."""
    if raw is None:
        return None
    if not isinstance(raw, list) or len(raw) == 0:
        return None
    points: list[list[float]] = []
    for item in raw:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Контур поля: каждая точка должна быть [широта, долгота]',
            )
        try:
            lat = float(item[0])
            lon = float(item[1])
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Контур поля: координаты должны быть числами',
            ) from exc
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Контур поля: координата вне допустимого диапазона',
            )
        points.append([round(lat, 6), round(lon, 6)])

    if len(points) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Контур поля должен содержать не менее 3 точек',
        )

    unique = {(p[0], p[1]) for p in points}
    if len(unique) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Контур должен содержать не менее 3 различных точек',
        )
    return points


def polygon_centroid(polygon: list[list[float]]) -> tuple[float, float]:
    """Simple vertex-average centroid — stable weather/reference point."""
    n = len(polygon)
    lat = sum(p[0] for p in polygon) / n
    lon = sum(p[1] for p in polygon) / n
    return round(lat, 6), round(lon, 6)


def polygon_area_ha(polygon: list[list[float]]) -> float:
    """Approximate geodesic area via equirectangular projection + shoelace (hectares)."""
    if len(polygon) < 3:
        return 0.0
    mean_lat = math.radians(sum(p[0] for p in polygon) / len(polygon))
    meters_per_deg_lat = 111_320.0
    meters_per_deg_lon = 111_320.0 * max(math.cos(mean_lat), 1e-6)

    xy: list[tuple[float, float]] = []
    for lat, lon in polygon:
        xy.append((lon * meters_per_deg_lon, lat * meters_per_deg_lat))

    area = 0.0
    for i in range(len(xy)):
        x1, y1 = xy[i]
        x2, y2 = xy[(i + 1) % len(xy)]
        area += x1 * y2 - x2 * y1
    area_m2 = abs(area) / 2.0
    return round(area_m2 / 10_000.0, 2)


def _point_on_segment(
    lat: float,
    lon: float,
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> bool:
    cross = (lon - lon1) * (lat2 - lat1) - (lat - lat1) * (lon2 - lon1)
    if abs(cross) > 1e-10:
        return False
    dot = (lon - lon1) * (lon2 - lon1) + (lat - lat1) * (lat2 - lat1)
    if dot < 0:
        return False
    len_sq = (lon2 - lon1) ** 2 + (lat2 - lat1) ** 2
    return dot <= len_sq


def point_in_polygon(lat: float, lon: float, ring: list[list[float]]) -> bool:
    """Ray-casting; boundary counts as inside. Ring is [[lat, lon], ...]."""
    if len(ring) < 3:
        return False
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        yi, xi = ring[i][0], ring[i][1]
        yj, xj = ring[j][0], ring[j][1]
        if _point_on_segment(lat, lon, yi, xi, yj, xj):
            return True
        if (yi > lat) != (yj > lat) and lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _sample_edge_points(
    polygon: list[list[float]],
    samples_per_edge: int = 4,
) -> list[tuple[float, float]]:
    """Vertices plus mid-edge samples for stronger containment checks."""
    points: list[tuple[float, float]] = [(p[0], p[1]) for p in polygon]
    n = len(polygon)
    for i in range(n):
        lat1, lon1 = polygon[i]
        lat2, lon2 = polygon[(i + 1) % n]
        for step in range(1, samples_per_edge):
            t = step / samples_per_edge
            points.append((lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t))
    return points


def polygon_contains_polygon(
    outer: list[list[float]],
    inner: list[list[float]],
) -> bool:
    """True if inner lies entirely inside outer (vertices + edge samples)."""
    if len(outer) < 3 or len(inner) < 3:
        return False
    for lat, lon in _sample_edge_points(inner):
        if not point_in_polygon(lat, lon, outer):
            return False
    return True


# Intersection / planting validation: touching edges is OK; area above this is overlap.
POLYGON_OVERLAP_EPSILON_HA = 1e-4  # 1 m²


def polygon_is_within_field(
    field_polygon: list[list[float]],
    planting_polygon: list[list[float]],
) -> bool:
    """Alias for containment used by planting validators."""
    return polygon_contains_polygon(field_polygon, planting_polygon)


def _segments_properly_intersect(
    a1: tuple[float, float],
    a2: tuple[float, float],
    b1: tuple[float, float],
    b2: tuple[float, float],
) -> bool:
    """True when segments cross (shared endpoint alone is not a crossing)."""

    def orient(p: tuple[float, float], q: tuple[float, float], r: tuple[float, float]) -> float:
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    def on_seg(p: tuple[float, float], q: tuple[float, float], r: tuple[float, float]) -> bool:
        return (
            min(p[0], r[0]) - 1e-12 <= q[0] <= max(p[0], r[0]) + 1e-12
            and min(p[1], r[1]) - 1e-12 <= q[1] <= max(p[1], r[1]) + 1e-12
        )

    o1 = orient(a1, a2, b1)
    o2 = orient(a1, a2, b2)
    o3 = orient(b1, b2, a1)
    o4 = orient(b1, b2, a2)
    if (o1 > 0) != (o2 > 0) and (o3 > 0) != (o4 > 0):
        # Proper crossing — exclude near-endpoint touches
        if abs(o1) < 1e-12 or abs(o2) < 1e-12 or abs(o3) < 1e-12 or abs(o4) < 1e-12:
            return False
        return True
    return False


def polygon_self_intersects(polygon: list[list[float]]) -> bool:
    """Detect non-adjacent edge crossings (self-intersecting ring)."""
    n = len(polygon)
    if n < 4:
        return False
    pts = [(p[0], p[1]) for p in polygon]
    for i in range(n):
        a1, a2 = pts[i], pts[(i + 1) % n]
        for j in range(i + 1, n):
            # Skip same and adjacent edges (including first/last)
            if abs(i - j) <= 1 or (i == 0 and j == n - 1) or (j == 0 and i == n - 1):
                continue
            if (i + 1) % n == j or (j + 1) % n == i:
                continue
            b1, b2 = pts[j], pts[(j + 1) % n]
            if _segments_properly_intersect(a1, a2, b1, b2):
                return True
    return False


def validate_polygon(
    raw: Any,
    *,
    label: str = 'Контур культуры',
) -> list[list[float]]:
    """Strict polygon for plantings: normalize, positive area, no self-intersection."""
    try:
        points = normalize_polygon(raw)
    except HTTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'{label} имеет некорректную геометрию',
        ) from exc
    if points is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'{label} имеет некорректную геометрию',
        )
    if polygon_self_intersects(points):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'{label} имеет некорректную геометрию',
        )
    area = polygon_area_ha(points)
    if area <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'{label} имеет некорректную геометрию',
        )
    return points


def _project_ring(
    polygon: list[list[float]],
    mean_lat: float,
) -> list[tuple[float, float]]:
    meters_per_deg_lat = 111_320.0
    meters_per_deg_lon = 111_320.0 * max(math.cos(math.radians(mean_lat)), 1e-6)
    return [(lon * meters_per_deg_lon, lat * meters_per_deg_lat) for lat, lon in polygon]


def _clip_edge(
    subject: list[tuple[float, float]],
    x1: float,
    y1: float,
    x2: float,
    y2: float,
) -> list[tuple[float, float]]:
    """Sutherland–Hodgman clip against one directed edge (inside = left)."""
    if not subject:
        return []
    out: list[tuple[float, float]] = []
    dx, dy = x2 - x1, y2 - y1

    def inside(p: tuple[float, float]) -> bool:
        return dx * (p[1] - y1) - dy * (p[0] - x1) >= -1e-9

    def intersect(
        p: tuple[float, float],
        q: tuple[float, float],
    ) -> tuple[float, float]:
        x3, y3 = p
        x4, y4 = q
        den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        if abs(den) < 1e-18:
            return q
        t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
        return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))

    prev = subject[-1]
    prev_in = inside(prev)
    for cur in subject:
        cur_in = inside(cur)
        if cur_in:
            if not prev_in:
                out.append(intersect(prev, cur))
            out.append(cur)
        elif prev_in:
            out.append(intersect(prev, cur))
        prev = cur
        prev_in = cur_in
    return out


def _clip_polygon(
    subject: list[tuple[float, float]],
    clip: list[tuple[float, float]],
) -> list[tuple[float, float]]:
    output = subject[:]
    n = len(clip)
    for i in range(n):
        if not output:
            return []
        x1, y1 = clip[i]
        x2, y2 = clip[(i + 1) % n]
        output = _clip_edge(output, x1, y1, x2, y2)
    return output


def _shoelace_m2(xy: list[tuple[float, float]]) -> float:
    if len(xy) < 3:
        return 0.0
    area = 0.0
    for i in range(len(xy)):
        x1, y1 = xy[i]
        x2, y2 = xy[(i + 1) % len(xy)]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def polygon_intersection_area_ha(
    a: list[list[float]],
    b: list[list[float]],
) -> float:
    """Intersection area of two rings in hectares (edge touch ≈ 0)."""
    if len(a) < 3 or len(b) < 3:
        return 0.0
    mean_lat = (sum(p[0] for p in a) + sum(p[0] for p in b)) / (len(a) + len(b))
    ax = _project_ring(a, mean_lat)
    bx = _project_ring(b, mean_lat)
    # Ensure clip winding is CCW for "inside = left"
    if _shoelace_m2(bx) and _signed_area(bx) < 0:
        bx = list(reversed(bx))
    if _signed_area(ax) < 0:
        ax = list(reversed(ax))
    clipped = _clip_polygon(ax, bx)
    return round(_shoelace_m2(clipped) / 10_000.0, 6)


def _signed_area(xy: list[tuple[float, float]]) -> float:
    area = 0.0
    for i in range(len(xy)):
        x1, y1 = xy[i]
        x2, y2 = xy[(i + 1) % len(xy)]
        area += x1 * y2 - x2 * y1
    return area / 2.0


def polygons_overlap(
    a: list[list[float]],
    b: list[list[float]],
    *,
    epsilon_ha: float = POLYGON_OVERLAP_EPSILON_HA,
) -> bool:
    """True when intersection area exceeds epsilon (shared boundary is fine)."""
    return polygon_intersection_area_ha(a, b) > epsilon_ha


def weather_point_from_location(
    *,
    latitude: float | None,
    longitude: float | None,
    polygon: Any,
) -> tuple[float, float] | None:
    """Prefer explicit lat/lon; else centroid of polygon. None if neither usable."""
    if latitude is not None and longitude is not None:
        return float(latitude), float(longitude)
    try:
        poly = normalize_polygon(polygon) if polygon else None
    except HTTPException:
        return None
    if poly:
        return polygon_centroid(poly)
    return None


def apply_geometry_on_write(
    *,
    latitude: float | None,
    longitude: float | None,
    polygon: Any,
    area_ha: float | None,
    clear_polygon: bool = False,
) -> tuple[float | None, float | None, list[list[float]] | None, float | None]:
    """Normalize polygon and fill weather point / area when missing.

    clear_polygon=True stores NULL polygon (explicit clear from client).
    """
    if clear_polygon:
        normalized: list[list[float]] | None = None
    elif polygon is None:
        normalized = None
    else:
        normalized = normalize_polygon(polygon)

    lat = latitude
    lon = longitude
    if normalized and (lat is None or lon is None):
        c_lat, c_lon = polygon_centroid(normalized)
        lat = lat if lat is not None else c_lat
        lon = lon if lon is not None else c_lon

    next_area = area_ha
    if normalized and next_area is None:
        next_area = polygon_area_ha(normalized)

    return lat, lon, normalized, next_area
