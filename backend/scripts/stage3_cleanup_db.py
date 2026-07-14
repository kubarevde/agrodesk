"""One-shot Stage 3 DB cleanup: remove non-seed equipment, fix Field #5 area."""
from __future__ import annotations

import httpx

BASE = 'http://localhost:8000'
SEED_NAMES = {
    'МТЗ-82',
    'К-700',
    'Дон-1500Б',
    'Газель',
    'КамАЗ',
    'Опрыскиватель Jacto',
    'Культиватор КПС-4',
    'Сеялка СЗ-3.6',
}


def main() -> None:
    c = httpx.Client(timeout=30)
    token = c.post(
        f'{BASE}/api/auth/login',
        json={'employee_code': 'EMP000', 'password': '1234'},
    ).json()['access_token']
    h = {'Authorization': f'Bearer {token}'}

    eq = c.get(f'{BASE}/api/equipment', headers=h).json()
    for item in eq:
        if item['name'] not in SEED_NAMES:
            r = c.delete(f'{BASE}/api/equipment/{item["id"]}', headers=h)
            print(f'delete equipment {item["id"]!r} {item["name"]!r} -> {r.status_code}')

    fields = c.get(f'{BASE}/api/fields', headers=h).json()
    for field in fields:
        if field['name'] == 'Поле №5':
            r = c.patch(
                f'{BASE}/api/fields/{field["id"]}',
                headers=h,
                json={'area_ha': 70},
            )
            print(f'field5 area -> {r.status_code} {r.json().get("area_ha")}')

    active = c.get(f'{BASE}/api/equipment', headers=h, params={'is_active': True}).json()
    print(f'active equipment count: {len(active)}')


if __name__ == '__main__':
    main()
