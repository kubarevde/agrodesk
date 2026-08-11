"""API: fields and shipments persist crop_code + crop_type together."""

from __future__ import annotations

from datetime import date
from uuid import uuid4

import httpx


def test_create_field_with_crop_code(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Legacy crop_* on FieldCreate is ignored — culture lives on plantings."""
    name = f'Поле crop {uuid4().hex[:6]}'
    created = client.post(
        '/api/fields',
        headers=admin_headers,
        json={'name': name, 'crop_code': 'wheat', 'crop_type': 'Пшеница', 'area_ha': 10},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body.get('crop_code') is None
    assert body.get('crop_type') is None

    planting = client.post(
        f"/api/fields/{body['id']}/plantings",
        headers=admin_headers,
        json={
            'crop_code': 'wheat',
            'area_ha': 1,
            'season_year': date.today().year,
            'occupies_whole_field': False,
        },
    )
    assert planting.status_code == 201, planting.text
    assert planting.json().get('crop_code') == 'wheat'


def test_create_shipment_with_crop_code(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': date.today().isoformat(),
            'crop_type': 'Пшеница',
            'crop_code': 'wheat',
            'quantity_kg': 10,
            'price_per_kg': 1,
            'destination': 'Тест',
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body.get('crop_code') == 'wheat'
    assert body.get('crop_type') == 'Пшеница'


def test_create_shipment_resolves_code_from_name(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': date.today().isoformat(),
            'crop_type': 'Ячмень',
            'quantity_kg': 5,
            'price_per_kg': 2,
            'destination': 'Тест',
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body.get('crop_type') == 'Ячмень'
    assert body.get('crop_code') == 'barley'
