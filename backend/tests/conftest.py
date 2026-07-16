"""Shared fixtures: always target Demo AgroDesk, never orgs[0]."""

from __future__ import annotations

import os

import httpx
import pytest

BASE = os.environ.get('API_BASE_URL', 'http://127.0.0.1:8000')


@pytest.fixture(scope='module')
def client() -> httpx.Client:
    with httpx.Client(base_url=BASE, timeout=30) as c:
        yield c


@pytest.fixture(scope='module')
def demo_org_id(client: httpx.Client) -> str:
    r = client.get('/api/auth/orgs')
    assert r.status_code == 200, r.text
    orgs = r.json()
    assert orgs, 'seed organizations first (python -m app.seed)'
    demo = next(
        (
            o
            for o in orgs
            if o.get('slug') in ('demo', 'main') or 'Demo' in (o.get('name') or '')
        ),
        None,
    )
    assert demo, f'Demo org not found in {[o.get("slug") for o in orgs]}'
    return demo['id']


@pytest.fixture(scope='module')
def org_id(demo_org_id: str) -> str:
    """Alias used by older tests."""
    return demo_org_id


@pytest.fixture(scope='module')
def admin_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP000', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope='module')
def manager_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP003', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}
