"""Crop rotation plans + harvest linked to field_planting_id."""

from __future__ import annotations

import uuid
from datetime import date

import httpx


def _create_crop(client: httpx.Client, headers: dict[str, str], name: str) -> dict:
    created = client.post('/api/dictionaries/crop', headers=headers, json={'name': name})
    assert created.status_code == 201, created.text
    return created.json()


def _create_variety(
    client: httpx.Client, headers: dict[str, str], crop_code: str, name: str
) -> dict:
    created = client.post(
        '/api/crop-varieties',
        headers=headers,
        json={'crop_code': crop_code, 'name': name},
    )
    assert created.status_code == 201, created.text
    return created.json()


def _create_harvest_sku(
    client: httpx.Client, headers: dict[str, str], crop_code: str
) -> dict:
    res = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'Harvest {crop_code} {uuid.uuid4().hex[:6]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 0,
            'min_stock': 0,
            'total_capacity': 100000,
            'crop_code': crop_code,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_rotation_warning_and_harvest_by_planting(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    suffix = uuid.uuid4().hex[:6]
    year = date.today().year
    wheat = _create_crop(client, admin_headers, f'Пшеница св {suffix}')
    potato = _create_crop(client, admin_headers, f'Картофель св {suffix}')
    kolombo = _create_variety(client, admin_headers, potato['code'], f'Коломбо {suffix}')
    gala = _create_variety(client, admin_headers, potato['code'], f'Гала {suffix}')

    field = client.post(
        '/api/fields',
        headers=admin_headers,
        json={
            'name': f'Поле севооборот {suffix}',
            'crop_code': wheat['code'],
            'area_ha': 100,
        },
    )
    assert field.status_code == 201, field.text
    field_id = field.json()['id']

    wheat_p = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': wheat['code'],
            'area_ha': 60,
            'season_year': year,
            'status': 'planted',
        },
    )
    assert wheat_p.status_code == 201, wheat_p.text

    kolombo_p = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': potato['code'],
            'variety_id': kolombo['id'],
            'area_ha': 2.5,
            'season_year': year,
            'status': 'planted',
        },
    )
    assert kolombo_p.status_code == 201, kolombo_p.text
    kolombo_id = kolombo_p.json()['id']

    gala_p = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': potato['code'],
            'variety_id': gala['id'],
            'area_ha': 2.5,
            'season_year': year,
            'status': 'planted',
            'comment': 'южный клин',
        },
    )
    assert gala_p.status_code == 201, gala_p.text

    # Next year potato plan → consecutive crop warning (non-blocking)
    plan = client.post(
        f'/api/fields/{field_id}/rotation-plans',
        headers=admin_headers,
        json={
            'crop_code': potato['code'],
            'area_ha': 10,
            'season_year': year + 1,
        },
    )
    assert plan.status_code == 201, plan.text
    assert plan.json().get('warning')
    assert str(year) in plan.json()['warning']

    other = client.post(
        f'/api/fields/{field_id}/rotation-plans',
        headers=admin_headers,
        json={
            'crop_code': wheat['code'],
            'area_ha': 5,
            'season_year': year + 2,
        },
    )
    assert other.status_code == 201, other.text
    # Wheat was fact this year — warning for year+1 would warn; year+2 after gap may still
    # warn only if year+1 has wheat plan — we planted wheat only as year fact, so year+2
    # previous year is year+1 with potato plan only → no wheat warning.
    assert other.json().get('warning') in (None, '')

    sku = _create_harvest_sku(client, admin_headers, potato['code'])

    # Multi-planting: harvest without planting_id rejected
    blocked = client.post(
        f'/api/fields/{field_id}/harvest',
        headers=admin_headers,
        json={'inventory_item_id': sku['id'], 'quantity': 100, 'date': date.today().isoformat()},
    )
    assert blocked.status_code == 400, blocked.text

    h1 = client.post(
        f'/api/fields/{field_id}/harvest',
        headers=admin_headers,
        json={
            'inventory_item_id': sku['id'],
            'quantity': 500,
            'date': date.today().isoformat(),
            'field_planting_id': kolombo_id,
            'harvest_status': 'partially_harvested',
        },
    )
    assert h1.status_code == 201, h1.text
    assert h1.json().get('field_id') == field_id

    h2 = client.post(
        f'/api/fields/{field_id}/harvest',
        headers=admin_headers,
        json={
            'inventory_item_id': sku['id'],
            'quantity': 250,
            'date': date.today().isoformat(),
            'field_planting_id': kolombo_id,
            'harvest_status': 'harvested',
        },
    )
    assert h2.status_code == 201, h2.text

    listed = client.get(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        params={'season_year': year, 'include_harvest': True},
    )
    assert listed.status_code == 200, listed.text
    rows = {row['id']: row for row in listed.json()}
    assert float(rows[kolombo_id]['harvested_qty']) == 750.0
    # 750 kg / 2.5 ha = 300 kg/ha
    assert float(rows[kolombo_id]['yield_kg_per_ha']) == 300.0
    assert rows[kolombo_id]['status'] == 'harvested'
    # Gala separate — no harvest attributed
    assert rows[gala_p.json()['id']].get('harvested_qty') in (None, 0, 0.0)

    matrix = client.get(f'/api/fields/{field_id}/rotation', headers=admin_headers)
    assert matrix.status_code == 200, matrix.text
    assert matrix.json()['field_id'] == field_id
