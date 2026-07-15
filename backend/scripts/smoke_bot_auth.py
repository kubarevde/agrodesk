"""Smoke checks for Telegram bot auth."""

from __future__ import annotations

import httpx

BASE = 'http://localhost:8030'
SECRET = 'agrodesk-bot-secret-change-me'
TG_ID = 123456789


def main() -> None:
    with httpx.Client(timeout=30) as c:
        mgr = c.post(
            f'{BASE}/api/auth/login',
            json={'employee_code': 'EMP003', 'password': '1234'},
        )
        mgr.raise_for_status()
        hm = {'Authorization': f"Bearer {mgr.json()['access_token']}"}

        emp = c.post(
            f'{BASE}/api/auth/login',
            json={'employee_code': 'EMP001', 'password': '1234'},
        )
        emp.raise_for_status()
        emp1 = emp.json()['employee']

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
        assert missing.json()['detail'] == 'Telegram ID не привязан к сотруднику'

        bad = c.post(
            f'{BASE}/api/auth/bot-token',
            json={'telegram_id': TG_ID, 'secret': 'wrong-secret'},
        )
        print('bot-token bad secret', bad.status_code, bad.text)
        assert bad.status_code == 403

        print('ALL SMOKE OK')


if __name__ == '__main__':
    main()
