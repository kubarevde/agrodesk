"""Telegram ID binding: uniqueness, transfer, bot-token JWT claim.

Requires running API + seed (same as other httpx integration tests).
"""

from __future__ import annotations

import os
import uuid

import httpx
import pytest
from jose import jwt

BASE = os.environ.get('API_BASE_URL', 'http://127.0.0.1:8000')
SECRET = os.environ.get('BOT_INTERNAL_SECRET', 'agrodesk-bot-secret-change-me')
# Must match backend settings.SECRET_KEY in test env (default from config).
JWT_SECRET = os.environ.get('SECRET_KEY', 'change-me-in-production')


@pytest.fixture
def client() -> httpx.Client:
    with httpx.Client(base_url=BASE, timeout=30) as c:
        yield c


@pytest.fixture
def demo_org_id(client: httpx.Client) -> str:
    r = client.get('/api/auth/orgs')
    assert r.status_code == 200, r.text
    orgs = r.json()
    demo = next(
        (
            o
            for o in orgs
            if o.get('slug') in ('demo', 'main') or 'Demo' in (o.get('name') or '')
        ),
        None,
    )
    assert demo, 'Demo org missing — run seed'
    return demo['id']


@pytest.fixture
def admin_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP000', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _create_employee(client: httpx.Client, headers: dict[str, str], suffix: str) -> dict:
    code = f'TG{suffix}'[:20]
    r = client.post(
        '/api/employees',
        headers=headers,
        json={
            'employee_code': code,
            'full_name': f'TG Test {suffix}',
            'role': 'employee',
            'password': '1234',
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def _deactivate(client: httpx.Client, headers: dict[str, str], employee_id: str) -> None:
    r = client.delete(f'/api/employees/{employee_id}', headers=headers)
    assert r.status_code == 204, r.text


def test_duplicate_telegram_id_rejected(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    suffix = uuid.uuid4().hex[:8]
    tg = 900_000_000 + (int(suffix[:6], 16) % 50_000_000)
    a = _create_employee(client, admin_headers, f'A{suffix}')
    b = _create_employee(client, admin_headers, f'B{suffix}')
    try:
        r1 = client.patch(
            f'/api/employees/{a["id"]}/link-telegram',
            headers=admin_headers,
            json={'telegram_id': tg},
        )
        assert r1.status_code == 200, r1.text
        assert r1.json()['telegram_id'] == tg

        r2 = client.patch(
            f'/api/employees/{b["id"]}/link-telegram',
            headers=admin_headers,
            json={'telegram_id': tg},
        )
        assert r2.status_code == 409, r2.text
        assert 'уже привязан' in (r2.json().get('detail') or '').lower()

        # A still holds it
        ra = client.get(f'/api/employees/{a["id"]}', headers=admin_headers)
        assert ra.json()['telegram_id'] == tg
        rb = client.get(f'/api/employees/{b["id"]}', headers=admin_headers)
        assert rb.json()['telegram_id'] is None
    finally:
        _deactivate(client, admin_headers, a['id'])
        _deactivate(client, admin_headers, b['id'])


def test_force_transfer_clears_previous_holder(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    suffix = uuid.uuid4().hex[:8]
    tg = 910_000_000 + (int(suffix[:6], 16) % 50_000_000)
    a = _create_employee(client, admin_headers, f'C{suffix}')
    b = _create_employee(client, admin_headers, f'D{suffix}')
    try:
        assert (
            client.patch(
                f'/api/employees/{a["id"]}/link-telegram',
                headers=admin_headers,
                json={'telegram_id': tg},
            ).status_code
            == 200
        )

        r = client.patch(
            f'/api/employees/{b["id"]}/link-telegram',
            headers=admin_headers,
            json={'telegram_id': tg, 'force_transfer': True},
        )
        assert r.status_code == 200, r.text
        assert r.json()['telegram_id'] == tg

        ra = client.get(f'/api/employees/{a["id"]}', headers=admin_headers)
        assert ra.json()['telegram_id'] is None
        rb = client.get(f'/api/employees/{b["id"]}', headers=admin_headers)
        assert rb.json()['telegram_id'] == tg

        # Old TG must authorize as B only
        tok = client.post(
            '/api/auth/bot-token',
            json={'telegram_id': tg, 'secret': SECRET},
        )
        assert tok.status_code == 200, tok.text
        me = client.get(
            '/api/employees/me',
            headers={'Authorization': f"Bearer {tok.json()['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()['id'] == b['id']
    finally:
        _deactivate(client, admin_headers, a['id'])
        _deactivate(client, admin_headers, b['id'])


def test_unlink_and_bot_token_404(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    suffix = uuid.uuid4().hex[:8]
    tg = 920_000_000 + (int(suffix[:6], 16) % 50_000_000)
    emp = _create_employee(client, admin_headers, f'E{suffix}')
    try:
        assert (
            client.patch(
                f'/api/employees/{emp["id"]}/link-telegram',
                headers=admin_headers,
                json={'telegram_id': tg},
            ).status_code
            == 200
        )
        unlink = client.patch(
            f'/api/employees/{emp["id"]}/link-telegram',
            headers=admin_headers,
            json={'telegram_id': None},
        )
        assert unlink.status_code == 200, unlink.text
        assert unlink.json()['telegram_id'] is None

        tok = client.post(
            '/api/auth/bot-token',
            json={'telegram_id': tg, 'secret': SECRET},
        )
        assert tok.status_code == 404
    finally:
        _deactivate(client, admin_headers, emp['id'])


def test_bot_token_embeds_telegram_claim_and_rejects_stale(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    suffix = uuid.uuid4().hex[:8]
    tg = 930_000_000 + (int(suffix[:6], 16) % 50_000_000)
    a = _create_employee(client, admin_headers, f'F{suffix}')
    b = _create_employee(client, admin_headers, f'G{suffix}')
    try:
        assert (
            client.patch(
                f'/api/employees/{a["id"]}/link-telegram',
                headers=admin_headers,
                json={'telegram_id': tg},
            ).status_code
            == 200
        )
        tok_a = client.post(
            '/api/auth/bot-token',
            json={'telegram_id': tg, 'secret': SECRET},
        )
        assert tok_a.status_code == 200
        token = tok_a.json()['access_token']
        claims = jwt.get_unverified_claims(token)
        assert int(claims['telegram_id']) == tg
        assert claims['sub'] == a['id']

        # Transfer to B — A's token must die
        assert (
            client.patch(
                f'/api/employees/{b["id"]}/link-telegram',
                headers=admin_headers,
                json={'telegram_id': tg, 'force_transfer': True},
            ).status_code
            == 200
        )
        stale = client.get(
            '/api/employees/me',
            headers={'Authorization': f'Bearer {token}'},
        )
        assert stale.status_code == 401, stale.text
    finally:
        _deactivate(client, admin_headers, a['id'])
        _deactivate(client, admin_headers, b['id'])


def test_deactivate_clears_telegram_id(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    suffix = uuid.uuid4().hex[:8]
    tg = 940_000_000 + (int(suffix[:6], 16) % 50_000_000)
    emp = _create_employee(client, admin_headers, f'H{suffix}')
    assert (
        client.patch(
            f'/api/employees/{emp["id"]}/link-telegram',
            headers=admin_headers,
            json={'telegram_id': tg},
        ).status_code
        == 200
    )
    _deactivate(client, admin_headers, emp['id'])

    # Soft-deleted row should not hold TG; bot-token 404
    tok = client.post(
        '/api/auth/bot-token',
        json={'telegram_id': tg, 'secret': SECRET},
    )
    assert tok.status_code == 404

    # TG free for another employee
    other = _create_employee(client, admin_headers, f'I{suffix}')
    try:
        r = client.patch(
            f'/api/employees/{other["id"]}/link-telegram',
            headers=admin_headers,
            json={'telegram_id': tg},
        )
        assert r.status_code == 200, r.text
    finally:
        _deactivate(client, admin_headers, other['id'])


def test_role_change_visible_on_employees_me(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    suffix = uuid.uuid4().hex[:8]
    tg = 950_000_000 + (int(suffix[:6], 16) % 50_000_000)
    emp = _create_employee(client, admin_headers, f'J{suffix}')
    try:
        assert (
            client.patch(
                f'/api/employees/{emp["id"]}/link-telegram',
                headers=admin_headers,
                json={'telegram_id': tg},
            ).status_code
            == 200
        )
        tok = client.post(
            '/api/auth/bot-token',
            json={'telegram_id': tg, 'secret': SECRET},
        ).json()['access_token']
        headers = {'Authorization': f'Bearer {tok}'}
        me1 = client.get('/api/employees/me', headers=headers)
        assert me1.json()['role'] == 'employee'

        up = client.patch(
            f'/api/employees/{emp["id"]}',
            headers=admin_headers,
            json={'role': 'manager'},
        )
        assert up.status_code == 200, up.text

        me2 = client.get('/api/employees/me', headers=headers)
        assert me2.status_code == 200
        assert me2.json()['role'] == 'manager'
    finally:
        _deactivate(client, admin_headers, emp['id'])
