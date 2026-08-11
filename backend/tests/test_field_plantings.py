"""Field plantings API: multi-crop assignments with area checks.

Product rule: culture/variety live on field_plantings. FieldCreate accepts
legacy crop_* for old clients but does not write them onto Location.
"""

from __future__ import annotations

import uuid

import httpx


def _create_crop(client: httpx.Client, headers: dict[str, str], name: str) -> dict:
    created = client.post(
        '/api/dictionaries/crop',
        headers=headers,
        json={'name': name},
    )
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


def _seed_legacy_field_crop(*, field_id: str, crop_code: str, crop_type: str) -> None:
    """Simulate pre-migration Location.crop_* without going through FieldCreate."""
    from sqlalchemy import create_engine, text

    from app.config import settings

    sync_url = settings.DATABASE_URL.replace('+asyncpg', '').replace('+psycopg', '')
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        conn.execute(
            text(
                'UPDATE locations SET crop_code = :code, crop_type = :ctype '
                'WHERE id = CAST(:id AS uuid)'
            ),
            {'code': crop_code, 'ctype': crop_type, 'id': field_id},
        )
    engine.dispose()


def test_field_plantings_area_and_legacy(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    suffix = uuid.uuid4().hex[:6]
    wheat = _create_crop(client, admin_headers, f'Пшеница пл {suffix}')
    potato = _create_crop(client, admin_headers, f'Картофель пл {suffix}')
    ren = _create_variety(client, admin_headers, wheat['code'], f'Рен {suffix}')
    kolombo = _create_variety(client, admin_headers, potato['code'], f'Коломбо {suffix}')
    gala = _create_variety(client, admin_headers, potato['code'], f'Гала {suffix}')

    field = client.post(
        '/api/fields',
        headers=admin_headers,
        json={
            'name': f'Поле посевы {suffix}',
            # Accepted but ignored on write — culture belongs on plantings.
            'crop_type': wheat['name'],
            'crop_code': wheat['code'],
            'area_ha': 100,
            'description': None,
            'latitude': None,
            'longitude': None,
            'polygon': [],
        },
    )
    assert field.status_code == 201, field.text
    field_id = field.json()['id']
    assert field.json()['crop_code'] is None
    assert field.json()['crop_type'] is None

    # Pre-existing Location.crop_* (migration leftover) for summary diagnostics.
    _seed_legacy_field_crop(
        field_id=field_id, crop_code=wheat['code'], crop_type=wheat['name']
    )

    year = 2026
    p1 = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': wheat['code'],
            'variety_id': ren['id'],
            'area_ha': 60,
            'season_year': year,
            'status': 'planted',
        },
    )
    assert p1.status_code == 201, p1.text
    assert p1.json()['crop_code'] == wheat['code']
    assert p1.json()['crop_name'] == wheat['name']
    assert p1.json()['variety_id'] == ren['id']

    p2 = client.post(
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
    assert p2.status_code == 201, p2.text
    assert p2.json()['crop_code'] == potato['code']
    assert p2.json()['crop_name'] == potato['name']

    p3 = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': potato['code'],
            'variety_id': gala['id'],
            'area_ha': 2.5,
            'season_year': year,
            'status': 'planted',
        },
    )
    assert p3.status_code == 201, p3.text
    assert p3.json()['crop_code'] == potato['code']

    summary = client.get(
        f'/api/fields/{field_id}/plantings/summary',
        headers=admin_headers,
        params={'season_year': year},
    )
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert float(body['allocated_ha']) == 65.0
    assert float(body['remaining_ha']) == 35.0
    assert body['legacy_crop_code'] == wheat['code']
    assert body['legacy_note']

    blocked = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': wheat['code'],
            'area_ha': 36,
            'season_year': year,
            'status': 'planted',
            'comment': 'перебор',
        },
    )
    assert blocked.status_code == 409, blocked.text
    assert '35' in blocked.json()['detail']

    no_variety = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': wheat['code'],
            'area_ha': 1,
            'season_year': year,
            'status': 'planted',
            'comment': 'без сорта отдельный клин',
        },
    )
    assert no_variety.status_code == 201, no_variety.text
    assert no_variety.json()['variety_id'] is None
    assert no_variety.json()['crop_code'] == wheat['code']

    # Plantings must not clear pre-existing Location.crop_* (legacy diagnostics).
    field_get = client.get(f'/api/fields/{field_id}', headers=admin_headers)
    assert field_get.status_code == 200
    assert field_get.json()['crop_code'] == wheat['code']


def test_planting_patch_allows_non_crop_fields_when_same_crop(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Sending crop_code/variety_id again must not block area/color updates after harvest."""
    from datetime import date

    suffix = uuid.uuid4().hex[:6]
    wheat = _create_crop(client, admin_headers, f'Пшеница патч {suffix}')
    year = date.today().year

    field = client.post(
        '/api/fields',
        headers=admin_headers,
        json={
            'name': f'Поле патч {suffix}',
            'area_ha': 50,
        },
    )
    assert field.status_code == 201, field.text
    field_id = field.json()['id']
    assert field.json()['crop_code'] is None

    planted = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=admin_headers,
        json={
            'crop_code': wheat['code'],
            'area_ha': 20,
            'season_year': year,
            'status': 'planted',
            'map_color': '#01696F',
        },
    )
    assert planted.status_code == 201, planted.text
    assert planted.json()['crop_code'] == wheat['code']
    assert planted.json()['crop_name'] == wheat['name']
    planting_id = planted.json()['id']

    item = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Harvest SKU {suffix}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 0,
            'min_stock': 0,
            'total_capacity': 100000,
            'crop_code': wheat['code'],
        },
    )
    assert item.status_code == 201, item.text

    harvest = client.post(
        f'/api/fields/{field_id}/harvest',
        headers=admin_headers,
        json={
            'inventory_item_id': item.json()['id'],
            'quantity': 100,
            'date': date.today().isoformat(),
            'field_planting_id': planting_id,
        },
    )
    assert harvest.status_code == 201, harvest.text

    # Same crop/variety in body (as UI used to send) + color/area change
    patched = client.patch(
        f'/api/fields/{field_id}/plantings/{planting_id}',
        headers=admin_headers,
        json={
            'crop_code': wheat['code'],
            'variety_id': None,
            'area_ha': 21,
            'map_color': '#437A22',
            'comment': 'после сбора',
            'season_year': year,
            'status': 'partially_harvested',
        },
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body['crop_code'] == wheat['code']
    assert float(body['area_ha']) == 21.0
    assert body['map_color'].upper() == '#437A22'
    assert body['comment'] == 'после сбора'

    # Real crop change still blocked
    other = _create_crop(client, admin_headers, f'Ячмень патч {suffix}')
    blocked = client.patch(
        f'/api/fields/{field_id}/plantings/{planting_id}',
        headers=admin_headers,
        json={'crop_code': other['code']},
    )
    assert blocked.status_code == 409, blocked.text
