"""Smoke: health + dictionaries + settings + inventory after migrate/seed.

  cd backend
  python scripts/smoke_settings.py
"""

from __future__ import annotations

import sys

import httpx

BASE = 'http://127.0.0.1:8000'


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=20.0) as client:
        health = client.get('/api/health')
        print('GET /api/health', health.status_code, health.text[:200])
        if health.status_code != 200:
            print('FAIL: API not reachable')
            return 1
        body = health.json()
        if body.get('db_up_to_date') is False:
            print('FAIL: db_up_to_date=false — run alembic upgrade head and restart API')
            return 1

        orgs = client.get('/api/auth/orgs').json()
        demo = next(
            (o for o in orgs if o.get('slug') in ('demo', 'main') or 'Demo' in o.get('name', '')),
            None,
        )
        if not demo:
            print('FAIL: Demo org missing — run python -m app.seed')
            return 1

        login = client.post(
            '/api/auth/login',
            json={'email': 'EMP000', 'password': '1234', 'org_id': demo['id']},
        )
        if login.status_code != 200:
            print('FAIL: login', login.status_code, login.text[:200])
            return 1
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

        checks = [
            '/api/dictionaries/crop',
            '/api/dictionaries/inventory_category',
            '/api/dictionaries/implement_category',
            '/api/dictionaries/expense_category',
            '/api/settings/organization',
            '/api/inventory',
            '/api/locations',
            '/api/work-types',
        ]
        for path in checks:
            r = client.get(path, headers=headers)
            ok = r.status_code == 200
            print(('OK' if ok else 'FAIL'), r.status_code, path)
            if not ok:
                return 1

    print('smoke_settings: all checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
