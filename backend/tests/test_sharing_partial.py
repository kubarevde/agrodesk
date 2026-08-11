"""Tests for partial-field sharing geometry and containment."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.field_geometry import (
    MIN_POLYGON_AREA_HA,
    polygon_area_ha,
    polygon_contains_polygon,
)
from app.services.sharing_partial import apply_sharing_scope


# Rough square ~0.25 ha near Kursk
FIELD = [
    [51.7300, 36.1900],
    [51.7300, 36.1920],
    [51.7315, 36.1920],
    [51.7315, 36.1900],
]

INSIDE = [
    [51.7302, 36.1902],
    [51.7302, 36.1910],
    [51.7308, 36.1910],
    [51.7308, 36.1902],
]

OUTSIDE = [
    [51.7302, 36.1902],
    [51.7302, 36.1950],  # east of field
    [51.7308, 36.1950],
    [51.7308, 36.1902],
]


class _Field:
    def __init__(self, polygon, is_active=True):
        self.polygon = polygon
        self.is_active = is_active
        self.area_ha = polygon_area_ha(polygon)


def test_polygon_contains_inside():
    assert polygon_contains_polygon(FIELD, INSIDE) is True


def test_polygon_contains_rejects_outside():
    assert polygon_contains_polygon(FIELD, OUTSIDE) is False


def test_apply_partial_computes_area():
    scope, poly, area, lat, lng = apply_sharing_scope(
        listing_type='field',
        scope='partial_field',
        shared_polygon_raw=INSIDE,
        field=_Field(FIELD),
    )
    assert scope == 'partial_field'
    assert poly is not None
    assert area is not None and float(area) >= MIN_POLYGON_AREA_HA
    assert lat is not None and lng is not None


def test_apply_partial_rejects_outside():
    with pytest.raises(HTTPException) as exc:
        apply_sharing_scope(
            listing_type='field',
            scope='partial_field',
            shared_polygon_raw=OUTSIDE,
            field=_Field(FIELD),
        )
    assert exc.value.status_code == 400
    assert 'внутри' in str(exc.value.detail).lower()


def test_full_field_clears_shared():
    scope, poly, area, _, _ = apply_sharing_scope(
        listing_type='field',
        scope='full_field',
        shared_polygon_raw=INSIDE,
        field=_Field(FIELD),
    )
    assert scope == 'full_field'
    assert poly is None
    assert area is None
