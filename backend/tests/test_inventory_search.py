"""GET /api/inventory?search= — name + harvest crop filters."""

from __future__ import annotations

from uuid import uuid4

import httpx


def test_inventory_search_by_name_and_crop(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    suffix = uuid4().hex[:8]
    harvest = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Search harvest {suffix}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 1,
            'min_stock': 0,
            'total_capacity': 100,
            'crop_code': 'wheat',
        },
    )
    assert harvest.status_code == 201, harvest.text
    fuel = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Search fuel {suffix}',
            'category': 'fuel',
            'unit': 'л',
            'current_stock': 1,
            'min_stock': 0,
            'total_capacity': 100,
        },
    )
    assert fuel.status_code == 201, fuel.text

    by_name = client.get(
        '/api/inventory',
        headers=admin_headers,
        params={'search': f'Search harvest {suffix}', 'is_active': True},
    )
    assert by_name.status_code == 200
    names = {row['name'] for row in by_name.json()}
    assert f'Search harvest {suffix}' in names
    assert f'Search fuel {suffix}' not in names

    by_crop = client.get(
        '/api/inventory',
        headers=admin_headers,
        params={'category': 'harvest', 'search': 'пшениц', 'is_active': True},
    )
    assert by_crop.status_code == 200
    crop_ids = {row['id'] for row in by_crop.json()}
    assert harvest.json()['id'] in crop_ids
    assert all(row['category'] == 'harvest' for row in by_crop.json())

    fuel_only = client.get(
        '/api/inventory',
        headers=admin_headers,
        params={'category': 'fuel', 'search': f'Search fuel {suffix}', 'is_active': True},
    )
    assert fuel_only.status_code == 200
    fuel_names = {row['name'] for row in fuel_only.json()}
    assert f'Search fuel {suffix}' in fuel_names
    assert f'Search harvest {suffix}' not in fuel_names
