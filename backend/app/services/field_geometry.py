"""Field polygon helpers: validate, centroid (weather point), approximate area."""

from __future__ import annotations

import math
from typing import Any

from fastapi import HTTPException, status


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
