"""Field harvest → warehouse income (no shipments side effects).

Culture for collect comes from field_plantings (or legacy Location.crop_* when
no plantings exist). FieldCreate does not write crop onto the field.
"""

from __future__ import annotations

from datetime import date
from uuid import uuid4

import httpx


def _create_harvest_item(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    crop_code: str = 'wheat',
) -> dict:
    res = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'Field harvest SKU {uuid4().hex[:8]}',
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


def _create_field(
    client: httpx.Client,
    headers: dict[str, str],
) -> dict:
    body: dict = {
        'name': f'Harvest field {uuid4().hex[:8]}',
        'area_ha': 10,
    }
    res = client.post('/api/fields', headers=headers, json=body)
    assert res.status_code == 201, res.text
    assert res.json().get('crop_code') in (None, '')
    return res.json()


def _create_planting(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    field_id: str,
    crop_code: str,
    area_ha: float = 10,
) -> dict:
    res = client.post(
        f'/api/fields/{field_id}/plantings',
        headers=headers,
        json={
            'crop_code': crop_code,
            'area_ha': area_ha,
            'season_year': date.today().year,
            'status': 'planted',
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body['crop_code'] == crop_code
    return body


def test_field_harvest_income_ok(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    field = _create_field(client, admin_headers)
    planting = _create_planting(
        client, admin_headers, field_id=field['id'], crop_code='wheat'
    )
    item = _create_harvest_item(client, admin_headers, crop_code='wheat')
    before_stock = float(item['current_stock'])

    res = client.post(
        f'/api/fields/{field["id"]}/harvest',
        headers=admin_headers,
        json={
            'inventory_item_id': item['id'],
            'quantity': 1500,
            'date': date.today().isoformat(),
            'field_planting_id': planting['id'],
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body['type'] == 'income'
    assert body['purpose'] == 'harvest_income'
    assert body['field_id'] == field['id']
    assert float(body['quantity']) == 1500
    assert 'Сбор с поля' in (body.get('reason') or '')

    stock = client.get(f'/api/inventory/{item["id"]}', headers=admin_headers)
    assert stock.status_code == 200
    assert float(stock.json()['current_stock']) == before_stock + 1500

    # Does not create crop shipment
    shipments = client.get('/api/shipments', headers=admin_headers)
    assert shipments.status_code == 200


def test_field_harvest_rejects_non_harvest_item(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    field = _create_field(client, admin_headers)
    _create_planting(client, admin_headers, field_id=field['id'], crop_code='wheat')
    fuel = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Fuel not harvest {uuid4().hex[:8]}',
            'category': 'fuel',
            'unit': 'л',
            'current_stock': 10,
            'min_stock': 0,
            'total_capacity': 100,
        },
    )
    assert fuel.status_code == 201, fuel.text
    res = client.post(
        f'/api/fields/{field["id"]}/harvest',
        headers=admin_headers,
        json={'inventory_item_id': fuel.json()['id'], 'quantity': 10},
    )
    assert res.status_code == 400, res.text


def test_field_harvest_rejects_crop_mismatch(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    field = _create_field(client, admin_headers)
    planting = _create_planting(
        client, admin_headers, field_id=field['id'], crop_code='wheat'
    )
    item = _create_harvest_item(client, admin_headers, crop_code='barley')
    res = client.post(
        f'/api/fields/{field["id"]}/harvest',
        headers=admin_headers,
        json={
            'inventory_item_id': item['id'],
            'quantity': 10,
            'field_planting_id': planting['id'],
        },
    )
    assert res.status_code == 400, res.text
    assert 'не совпадает' in res.json().get('detail', '').lower()


def test_field_harvest_rejects_inactive_sku(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    field = _create_field(client, admin_headers)
    planting = _create_planting(
        client, admin_headers, field_id=field['id'], crop_code='wheat'
    )
    item = _create_harvest_item(client, admin_headers, crop_code='wheat')
    archived = client.post(
        f'/api/inventory/{item["id"]}/archive',
        headers=admin_headers,
        json={'reason': 'тест неактивной позиции для сбора'},
    )
    assert archived.status_code == 200, archived.text
    assert archived.json()['is_active'] is False
    res = client.post(
        f'/api/fields/{field["id"]}/harvest',
        headers=admin_headers,
        json={
            'inventory_item_id': item['id'],
            'quantity': 10,
            'field_planting_id': planting['id'],
        },
    )
    assert res.status_code == 400, res.text
    assert 'неактив' in res.json().get('detail', '').lower()


def test_field_harvest_rejects_when_field_has_no_crop(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    field = _create_field(client, admin_headers)
    # Ensure both code and type are empty (create may leave defaults)
    from sqlalchemy import create_engine, text

    from app.config import settings

    sync_url = settings.DATABASE_URL.replace('+asyncpg', '').replace('+psycopg', '')
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        conn.execute(
            text(
                'UPDATE locations SET crop_code = NULL, crop_type = NULL '
                'WHERE id = CAST(:id AS uuid)'
            ),
            {'id': field['id']},
        )
    engine.dispose()

    item = _create_harvest_item(client, admin_headers, crop_code='wheat')
    res = client.post(
        f'/api/fields/{field["id"]}/harvest',
        headers=admin_headers,
        json={'inventory_item_id': item['id'], 'quantity': 10},
    )
    assert res.status_code == 400, res.text
    detail = res.json().get('detail', '').lower()
    assert 'культур' in detail


def test_field_harvest_rejects_sku_without_crop_code(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Legacy harvest row without crop_code cannot be used for collect."""
    from sqlalchemy import create_engine, text

    from app.config import settings

    field = _create_field(client, admin_headers)
    planting = _create_planting(
        client, admin_headers, field_id=field['id'], crop_code='wheat'
    )
    item = _create_harvest_item(client, admin_headers, crop_code='wheat')

    sync_url = settings.DATABASE_URL.replace('+asyncpg', '').replace('+psycopg', '')
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        conn.execute(
            text('UPDATE inventory_items SET crop_code = NULL WHERE id = CAST(:id AS uuid)'),
            {'id': item['id']},
        )
    engine.dispose()

    res = client.post(
        f'/api/fields/{field["id"]}/harvest',
        headers=admin_headers,
        json={
            'inventory_item_id': item['id'],
            'quantity': 10,
            'field_planting_id': planting['id'],
        },
    )
    assert res.status_code == 400, res.text
    assert 'культур' in res.json().get('detail', '').lower()


def test_field_harvest_resolves_crop_type_when_code_missing(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Legacy row: crop_type set, crop_code null — soft-fill then collect."""
    from sqlalchemy import create_engine, text

    from app.config import settings

    field = _create_field(client, admin_headers)
    item = _create_harvest_item(client, admin_headers, crop_code='wheat')

    # FieldCreate no longer writes crop_*; seed legacy Location.crop_type only.
    sync_url = settings.DATABASE_URL.replace('+asyncpg', '').replace('+psycopg', '')
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE locations SET crop_code = NULL, crop_type = 'Пшеница' "
                'WHERE id = CAST(:id AS uuid)'
            ),
            {'id': field['id']},
        )
    engine.dispose()

    cleared = client.get(f'/api/fields/{field["id"]}', headers=admin_headers)
    assert cleared.status_code == 200
    assert cleared.json().get('crop_code') in (None, '')
    assert cleared.json().get('crop_type') == 'Пшеница'

    res = client.post(
        f'/api/fields/{field["id"]}/harvest',
        headers=admin_headers,
        json={'inventory_item_id': item['id'], 'quantity': 25},
    )
    assert res.status_code == 201, res.text
    assert res.json()['purpose'] == 'harvest_income'

    after = client.get(f'/api/fields/{field["id"]}', headers=admin_headers)
    assert after.status_code == 200
    assert (after.json().get('crop_code') or '').strip() == 'wheat'
