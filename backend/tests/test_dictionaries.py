"""Dictionary + inventory smoke against running API (seeded DB).

Uses shared conftest fixtures (Demo org).
"""

from __future__ import annotations

import uuid

import httpx


def test_dictionaries_list_and_create(client: httpx.Client, admin_headers: dict[str, str]) -> None:
    crops = client.get('/api/dictionaries/crop', headers=admin_headers)
    assert crops.status_code == 200, crops.text
    assert isinstance(crops.json(), list)
    assert len(crops.json()) >= 1

    suffix = uuid.uuid4().hex[:6]
    created = client.post(
        '/api/dictionaries/crop',
        headers=admin_headers,
        json={'name': f'Культура тест {suffix}'},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body['name'].startswith('Культура тест')
    assert body['code']
    assert body['is_active'] is True


def test_inventory_item_create_update(client: httpx.Client, admin_headers: dict[str, str]) -> None:
    cats = client.get('/api/dictionaries/inventory_category', headers=admin_headers)
    assert cats.status_code == 200, cats.text
    code = cats.json()[0]['code']

    suffix = uuid.uuid4().hex[:6]
    created = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'ТМЦ тест {suffix}',
            'category': code,
            'unit': 'л',
            'current_stock': 5,
            'min_stock': 1,
            'total_capacity': 50,
        },
    )
    assert created.status_code == 201, created.text
    item = created.json()
    assert isinstance(item['category'], str)
    assert item['category'] == code

    patched = client.patch(
        f"/api/inventory/{item['id']}",
        headers=admin_headers,
        json={'min_stock': 2, 'name': f'ТМЦ тест {suffix} ред'},
    )
    assert patched.status_code == 200, patched.text


def test_organization_timezone(client: httpx.Client, admin_headers: dict[str, str]) -> None:
    r = client.get('/api/settings/organization', headers=admin_headers)
    assert r.status_code == 200, r.text
    assert 'timezone' in r.json()


def test_cannot_deactivate_used_inventory_category(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    inv = client.get('/api/inventory', headers=admin_headers, params={'is_active': True})
    assert inv.status_code == 200
    items = inv.json()
    if not items:
        return
    used_code = items[0]['category']
    cats = client.get('/api/dictionaries/inventory_category', headers=admin_headers).json()
    row = next((c for c in cats if c['code'] == used_code and c['is_active']), None)
    if row is None:
        return
    blocked = client.patch(
        f"/api/dictionaries/inventory_category/{row['id']}",
        headers=admin_headers,
        json={'is_active': False},
    )
    assert blocked.status_code == 409, blocked.text
    assert 'используется' in blocked.json()['detail'].lower() or 'Нельзя' in blocked.json()['detail']
