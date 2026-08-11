"""Geometry rules for field plantings (containment / overlap)."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.field_geometry import (
    polygon_intersection_area_ha,
    polygons_overlap,
    validate_polygon,
)


FIELD = [[51.0, 36.0], [51.0, 36.2], [51.2, 36.2], [51.2, 36.0]]


def test_validate_polygon_rejects_zero_area_line():
    with pytest.raises(HTTPException) as exc:
        validate_polygon([[51.0, 36.0], [51.0, 36.1], [51.0, 36.2]])
    assert exc.value.status_code == 422
    assert 'некорректную геометрию' in str(exc.value.detail)


def test_touching_boundary_intersection_near_zero():
    left = [[51.05, 36.05], [51.05, 36.1], [51.1, 36.1], [51.1, 36.05]]
    right = [[51.05, 36.1], [51.05, 36.15], [51.1, 36.15], [51.1, 36.1]]
    assert polygon_intersection_area_ha(left, right) <= 1e-4
    assert not polygons_overlap(left, right)
