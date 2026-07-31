"""Harvest inventory SKUs require crop_code; non-harvest clears it."""

from __future__ import annotations

from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException

from app.services.harvest_inventory import normalize_item_crop_code


def test_normalize_harvest_requires_crop_code() -> None:
    assert normalize_item_crop_code('fuel', 'wheat') is None
    assert normalize_item_crop_code('fuel', None) is None
    assert normalize_item_crop_code('harvest', ' wheat ') == 'wheat'
    with pytest.raises(HTTPException) as exc:
        normalize_item_crop_code('harvest', None)
    assert exc.value.status_code == 400
    with pytest.raises(HTTPException):
        normalize_item_crop_code('harvest', '  ')


def test_create_harvest_without_crop_code_rejected(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    res = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Harvest no crop {uuid4().hex[:8]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 10,
            'min_stock': 0,
            'total_capacity': 100,
        },
    )
    assert res.status_code == 400, res.text
    assert 'культур' in res.json().get('detail', '').lower()


def test_create_harvest_with_crop_code_ok(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    res = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Harvest wheat {uuid4().hex[:8]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 10,
            'min_stock': 0,
            'total_capacity': 100,
            'crop_code': 'wheat',
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body['crop_code'] == 'wheat'
    assert body['is_harvest'] is True


def test_create_harvest_unknown_crop_rejected(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    res = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Harvest bad crop {uuid4().hex[:8]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 1,
            'min_stock': 0,
            'total_capacity': 10,
            'crop_code': f'no_such_crop_{uuid4().hex[:6]}',
        },
    )
    assert res.status_code == 400, res.text
    assert 'неизвестн' in res.json().get('detail', '').lower()


def test_non_harvest_clears_crop_code(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    res = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Fuel ignore crop {uuid4().hex[:8]}',
            'category': 'fuel',
            'unit': 'л',
            'current_stock': 10,
            'min_stock': 0,
            'total_capacity': 100,
            'crop_code': 'wheat',
        },
    )
    assert res.status_code == 201, res.text
    assert res.json().get('crop_code') is None


def test_patch_harvest_without_crop_rejected_when_sku_has_none(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Legacy harvest row with null crop_code cannot be saved without providing one."""
    from sqlalchemy import create_engine, text

    from app.config import settings

    created = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Harvest needs crop {uuid4().hex[:8]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 1,
            'min_stock': 0,
            'total_capacity': 10,
            'crop_code': 'wheat',
        },
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']

    sync_url = settings.DATABASE_URL.replace('+asyncpg', '').replace('+psycopg', '')
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        conn.execute(
            text('UPDATE inventory_items SET crop_code = NULL WHERE id = CAST(:id AS uuid)'),
            {'id': item_id},
        )
    engine.dispose()

    omitted = client.patch(
        f'/api/inventory/{item_id}',
        headers=admin_headers,
        json={'name': created.json()['name'], 'category': 'harvest', 'unit': 'кг'},
    )
    assert omitted.status_code == 400, omitted.text
    assert 'культур' in omitted.json().get('detail', '').lower()

    fixed = client.patch(
        f'/api/inventory/{item_id}',
        headers=admin_headers,
        json={
            'name': created.json()['name'],
            'category': 'harvest',
            'unit': 'кг',
            'crop_code': 'barley',
        },
    )
    assert fixed.status_code == 200, fixed.text
    assert fixed.json().get('crop_code') == 'barley'


def test_patch_to_non_harvest_clears_crop_code(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Harvest then fuel {uuid4().hex[:8]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 5,
            'min_stock': 0,
            'total_capacity': 50,
            'crop_code': 'wheat',
        },
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']
    patched = client.patch(
        f'/api/inventory/{item_id}',
        headers=admin_headers,
        json={'category': 'other'},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json().get('crop_code') is None
    assert patched.json().get('is_harvest') is False
