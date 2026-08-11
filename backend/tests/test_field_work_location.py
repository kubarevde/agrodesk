"""Unit checks for system «Полевая работа» location protection."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.routers.fields import is_field_location
from app.services.field_work_location import (
    FIELD_WORK_LOCATION_CODE,
    FIELD_WORK_LOCATION_NAME,
    is_system_field_work_location,
    raise_if_system_location_locked,
)


def _loc(**kwargs):
    base = {
        'id': uuid4(),
        'name': 'Склад',
        'kind': 'object',
        'code': None,
        'is_system': False,
        'crop_type': None,
    }
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_system_location_detected_by_flag_and_code():
    assert is_system_field_work_location(_loc(is_system=True))
    assert is_system_field_work_location(_loc(code=FIELD_WORK_LOCATION_CODE))
    assert not is_system_field_work_location(_loc())


def test_system_location_cannot_deactivate_or_delete():
    item = _loc(
        name=FIELD_WORK_LOCATION_NAME,
        code=FIELD_WORK_LOCATION_CODE,
        is_system=True,
    )
    with pytest.raises(HTTPException) as deactivate:
        raise_if_system_location_locked(item, updates={'is_active': False})
    assert deactivate.value.status_code == 400

    with pytest.raises(HTTPException) as delete:
        raise_if_system_location_locked(item, deleting=True)
    assert delete.value.status_code == 400

    with pytest.raises(HTTPException) as rename:
        raise_if_system_location_locked(item, updates={'name': 'Другое'})
    assert rename.value.status_code == 400


def test_system_location_allows_geo_and_description():
    item = _loc(
        name=FIELD_WORK_LOCATION_NAME,
        code=FIELD_WORK_LOCATION_CODE,
        is_system=True,
    )
    raise_if_system_location_locked(
        item,
        updates={'description': 'обновлено', 'latitude': 51.1, 'longitude': 36.2},
    )


def test_field_list_excludes_system_polevaya():
    system = _loc(
        name=FIELD_WORK_LOCATION_NAME,
        kind='object',
        is_system=True,
        code=FIELD_WORK_LOCATION_CODE,
    )
    assert not is_field_location(system)

    # name.like('Поле%') legacy must not classify work objects as fields
    object_named_pole = _loc(name=FIELD_WORK_LOCATION_NAME, kind='object', is_system=False)
    assert not is_field_location(object_named_pole)

    real_field = _loc(name='Поле 1', kind='field', is_system=False)
    assert is_field_location(real_field)
