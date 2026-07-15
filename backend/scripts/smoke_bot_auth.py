"""Smoke checks for Telegram bot auth (org-scoped login)."""

from __future__ import annotations

import os

import httpx

BASE = os.environ.get('API_BASE_URL', 'http://localhost:8000')
SECRET = os.environ.get('BOT_INTERNAL_SECRET', 'agrodesk-bot-secret-change-me')
# Use seeded EMP001 telegram by default; temporarily override for isolated smoke
TG_ID = int(os.environ.get('SMOKE_TELEGRAM_ID', '123456789'))


def resolve_org_id(client: httpx.Client) -> str:
    env_org = os.environ.get('ORG_ID', '').strip()
    if env_org:
        return env_org
    r = client.get(f'{BASE}/api/auth/orgs')
    r.raise_for_status()
    orgs = r.json()
    assert orgs, 'No active organizations — run seed'
    return orgs[0]['id']


def login(client: httpx.Client, code: str, org_id: str) -> dict:
    r = client.post(
        f'{BASE}/api/auth/login',
        json={'email': code, 'password': '1234', 'org_id': org_id},
    )
    r.raise_for_status()
    return r.json()


def main() -> None:
    with httpx.Client(timeout=30) as c:
        org_id = resolve_org_id(c)
        print('org_id', org_id)

        mgr = login(c, 'EMP003', org_id)
        hm = {'Authorization': f"Bearer {mgr['access_token']}"}

        emp = login(c, 'EMP001', org_id)
        emp1 = emp['employee']

        link = c.patch(
            f"{BASE}/api/employees/{emp1['id']}/link-telegram",
            headers=hm,
            json={'telegram_id': TG_ID},
        )
        print('link-telegram', link.status_code, link.text[:200])
        assert link.status_code == 200, link.text
        assert link.json()['telegram_id'] == TG_ID

        ok = c.post(
            f'{BASE}/api/auth/bot-token',
            json={'telegram_id': TG_ID, 'secret': SECRET},
        )
        print('bot-token ok', ok.status_code, list(ok.json().keys()) if ok.status_code == 200 else ok.text)
        assert ok.status_code == 200, ok.text
        assert ok.json().get('access_token')

        missing = c.post(
            f'{BASE}/api/auth/bot-token',
            json={'telegram_id': 999999999, 'secret': SECRET},
        )
        print('bot-token unknown', missing.status_code, missing.text)
        assert missing.status_code == 404

        bad = c.post(
            f'{BASE}/api/auth/bot-token',
            json={'telegram_id': TG_ID, 'secret': 'wrong-secret'},
        )
        print('bot-token bad secret', bad.status_code, bad.text)
        assert bad.status_code == 403

        # Restore demo bot telegram for EMP001
        restore = c.patch(
            f"{BASE}/api/employees/{emp1['id']}/link-telegram",
            headers=hm,
            json={'telegram_id': 111111111},
        )
        print('restore telegram', restore.status_code)

        print('ALL SMOKE OK')


if __name__ == '__main__':
    main()
