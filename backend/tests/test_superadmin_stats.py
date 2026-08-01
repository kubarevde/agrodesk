"""Superadmin platform stats — separate from holding/tenant dashboards."""

from __future__ import annotations

import ast
import os
from pathlib import Path

import httpx
import pytest
from dotenv import load_dotenv

load_dotenv()

BACKEND_APP = Path(__file__).resolve().parents[1] / 'app'


def _superadmin_headers(client: httpx.Client) -> dict[str, str] | None:
    email = (os.environ.get('SUPERADMIN_EMAIL') or '').strip()
    password = (os.environ.get('SUPERADMIN_PASSWORD') or '').strip()
    if not email or not password:
        return None
    login = client.post(
        '/superadmin/api/auth/login',
        json={'email': email, 'password': password},
    )
    if login.status_code != 200:
        return None
    return {'Authorization': f"Bearer {login.json()['access_token']}"}


def test_superadmin_stats_service_boundaries() -> None:
    src = (BACKEND_APP / 'services' / 'superadmin_stats.py').read_text(encoding='utf-8')
    tree = ast.parse(src)
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module)
    assert not any('holding' in n for n in names)
    assert not any(n.endswith('.dashboard') or n == 'app.services.dashboard' for n in names)
    assert 'app.models.marketplace' in names or any('marketplace' in n for n in names)


def test_superadmin_stats_endpoint_shape(client: httpx.Client) -> None:
    headers = _superadmin_headers(client)
    if headers is None:
        pytest.skip('SUPERADMIN_EMAIL/PASSWORD not configured')

    # Tenant must not access platform stats
    orgs = client.get('/api/auth/orgs')
    assert orgs.status_code == 200
    demo = next(
        (
            o
            for o in orgs.json()
            if o.get('slug') in ('demo', 'main') or 'Demo' in (o.get('name') or '')
        ),
        None,
    )
    if demo:
        tenant = client.post(
            '/api/auth/login',
            json={'email': 'EMP000', 'password': '1234', 'org_id': demo['id']},
        )
        if tenant.status_code == 200:
            forbidden = client.get(
                '/superadmin/api/stats',
                headers={'Authorization': f"Bearer {tenant.json()['access_token']}"},
            )
            assert forbidden.status_code in (401, 403), forbidden.text

    r = client.get('/superadmin/api/stats', headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()

    required = {
        'total_orgs',
        'active_orgs',
        'trial_orgs',
        'total_employees',
        'total_shifts_today',
        'inactive_orgs',
        'basic_orgs',
        'pro_orgs',
        'active_employees',
        'open_shifts',
        'open_shifts_today',
        'support_total',
        'support_unread',
        'marketplace_orgs',
        'listings_pending_review',
        'listings_published',
        'orders_new',
        'hierarchy_links',
        'hierarchy_heads',
        'attention',
    }
    assert required.issubset(data.keys())
    assert data['total_orgs'] >= data['active_orgs']
    assert data['total_employees'] >= data['active_employees']
    assert 'holding_children' not in data
    assert 'month_shipments_kg' not in data
    assert isinstance(data['attention'], list)
    for item in data['attention']:
        assert item['severity'] in ('info', 'warning')
        assert item['count'] > 0


def test_tenant_dashboard_unaffected_by_superadmin_stats(client: httpx.Client) -> None:
    orgs = client.get('/api/auth/orgs')
    assert orgs.status_code == 200
    demo = next(
        (
            o
            for o in orgs.json()
            if o.get('slug') in ('demo', 'main') or 'Demo' in (o.get('name') or '')
        ),
        None,
    )
    if demo is None:
        pytest.skip('demo org not found')
    tenant = client.post(
        '/api/auth/login',
        json={'email': 'EMP000', 'password': '1234', 'org_id': demo['id']},
    )
    assert tenant.status_code == 200, tenant.text
    headers = {'Authorization': f"Bearer {tenant.json()['access_token']}"}
    dash = client.get('/api/dashboard/stats', headers=headers)
    assert dash.status_code == 200, dash.text
    holding = client.get('/api/holding/overview', headers=headers)
    # demo may or may not be head — either 200 or 403, never 500
    assert holding.status_code in (200, 403), holding.text
