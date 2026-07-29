"""Backfill weather lat/lon from polygon centroid for field locations.

Revision ID: 027_field_weather_centroid
Revises: 026_inventory_stock_repair

No schema change: `locations.polygon` (JSONB) and lat/lon already exist.
For rows with a usable polygon (≥3 points) and missing latitude/longitude,
store the vertex-average centroid so weather keeps working without UI edits.
Does not delete or alter polygons or other columns.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal

from alembic import op
from sqlalchemy import text

revision = '027_field_weather_centroid'
down_revision = '026_inventory_stock_repair'
branch_labels = None
depends_on = None

logger = logging.getLogger('alembic.runtime.migration')


def _centroid(points: list[list[float]]) -> tuple[float, float] | None:
    if len(points) < 3:
        return None
    lat = sum(p[0] for p in points) / len(points)
    lon = sum(p[1] for p in points) / len(points)
    return round(lat, 6), round(lon, 6)


def _parse_polygon(raw: object) -> list[list[float]] | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return None
    if not isinstance(raw, list):
        return None
    points: list[list[float]] = []
    for item in raw:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        try:
            points.append([float(item[0]), float(item[1])])
        except (TypeError, ValueError):
            continue
    return points if len(points) >= 3 else None


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        text(
            """
            SELECT id, latitude, longitude, polygon
            FROM locations
            WHERE polygon IS NOT NULL
              AND (latitude IS NULL OR longitude IS NULL)
            """
        )
    ).fetchall()

    updated = 0
    for row_id, lat, lon, polygon in rows:
        points = _parse_polygon(polygon)
        if not points:
            continue
        c = _centroid(points)
        if c is None:
            continue
        c_lat, c_lon = c
        new_lat = float(lat) if lat is not None else c_lat
        new_lon = float(lon) if lon is not None else c_lon
        conn.execute(
            text(
                """
                UPDATE locations
                SET latitude = :lat, longitude = :lon
                WHERE id = :id
                """
            ),
            {'lat': Decimal(str(new_lat)), 'lon': Decimal(str(new_lon)), 'id': row_id},
        )
        updated += 1
        logger.info('field centroid backfill: id=%s lat=%s lon=%s', row_id, new_lat, new_lon)

    logger.info('field weather centroid backfill complete: updated=%s', updated)


def downgrade() -> None:
    # Non-destructive: cannot know which lat/lon were user-entered vs backfilled.
    pass
