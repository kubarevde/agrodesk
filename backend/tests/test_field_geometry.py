"""Unit tests for field polygon geometry helpers."""

import pytest
from fastapi import HTTPException

from app.services.field_geometry import (
    apply_geometry_on_write,
    normalize_polygon,
    polygon_area_ha,
    polygon_centroid,
    weather_point_from_location,
)


def test_normalize_polygon_requires_three_points():
    with pytest.raises(HTTPException) as exc:
        normalize_polygon([[51.0, 36.0], [51.1, 36.0]])
    assert exc.value.status_code == 400


def test_centroid_and_weather_fallback():
    poly = [[51.0, 36.0], [51.0, 36.2], [51.2, 36.1]]
    lat, lon = polygon_centroid(poly)
    assert lat == pytest.approx(51.066667, abs=1e-5)
    assert weather_point_from_location(latitude=None, longitude=None, polygon=poly) == (
        lat,
        lon,
    )
    assert weather_point_from_location(latitude=50.0, longitude=35.0, polygon=poly) == (
        50.0,
        35.0,
    )


def test_apply_geometry_fills_lat_lon_and_area():
    poly = [[51.5, 36.5], [51.5, 36.51], [51.51, 36.505]]
    lat, lon, normalized, area = apply_geometry_on_write(
        latitude=None,
        longitude=None,
        polygon=poly,
        area_ha=None,
    )
    assert normalized is not None and len(normalized) == 3
    assert lat is not None and lon is not None
    assert area is not None and area > 0
    assert polygon_area_ha(normalized) == area
