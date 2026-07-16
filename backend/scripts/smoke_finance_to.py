"""Smoke: dictionaries, shipments, expenses, dashboard, equipment/implement TO.

  cd backend
  python scripts/smoke_finance_to.py
"""

from __future__ import annotations

import random
import sys
from datetime import date

import httpx

BASE = 'http://127.0.0.1:8000'


def main() -> int:
    today = date.today().isoformat()
    suffix = random.randint(1000, 9999)

    with httpx.Client(base_url=BASE, timeout=30.0) as client:
        health = client.get('/api/health')
        print('GET /api/health', health.status_code, health.text[:180])
        if health.status_code != 200:
            print('FAIL: API not reachable — start backend first')
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
            print('FAIL: login', login.status_code, login.text[:300])
            return 1
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

        for path in (
            '/api/dictionaries/crop',
            '/api/dictionaries/expense_category',
        ):
            r = client.get(path, headers=headers)
            print(('OK' if r.status_code == 200 else 'FAIL'), r.status_code, path, f'n={len(r.json()) if r.status_code == 200 else 0}')
            if r.status_code != 200:
                return 1

        crop = client.post(
            '/api/dictionaries/crop',
            headers=headers,
            json={'name': f'QA культура {suffix}', 'code': f'qa_crop_{suffix}'},
        )
        if crop.status_code not in (200, 201):
            print('FAIL: create crop', crop.status_code, crop.text[:300])
            return 1
        crop_name = crop.json()['name']
        print('OK create crop', crop_name)

        cat = client.post(
            '/api/dictionaries/expense_category',
            headers=headers,
            json={
                'name': f'QA категория {suffix}',
                'code': f'qa_exp_{suffix}',
            },
        )
        if cat.status_code not in (200, 201):
            print('FAIL: create expense_category', cat.status_code, cat.text[:300])
            return 1
        cat_code = cat.json()['code']
        print('OK create expense_category', cat_code)

        ship = client.post(
            '/api/shipments',
            headers=headers,
            json={
                'date': today,
                'crop_type': crop_name,
                'quantity_kg': 1000,
                'price_per_kg': 12.5,
                'destination': 'QA elevator',
            },
        )
        if ship.status_code not in (200, 201):
            print('FAIL: create shipment', ship.status_code, ship.text[:300])
            return 1
        print('OK shipment', ship.json().get('id'), ship.json().get('crop_type') or ship.json().get('cropType'))

        expense = client.post(
            '/api/expenses',
            headers=headers,
            json={
                'date': today,
                'category': cat_code,
                'amount': 3210,
                'description': 'QA expense from smoke',
            },
        )
        if expense.status_code not in (200, 201):
            print('FAIL: create expense', expense.status_code, expense.text[:300])
            return 1
        print('OK expense', expense.json().get('id'), expense.json().get('category'))

        stats = client.get('/api/dashboard/stats', headers=headers)
        if stats.status_code != 200:
            print('FAIL: dashboard', stats.status_code, stats.text[:300])
            return 1
        body = stats.json()
        print(
            'OK dashboard',
            'ship_sum=',
            body.get('month_shipments_sum'),
            'exp_sum=',
            body.get('month_expenses_sum'),
        )

        equipment = client.get('/api/equipment', headers=headers)
        if equipment.status_code != 200 or not equipment.json():
            print('FAIL: equipment list', equipment.status_code)
            return 1
        eq_id = equipment.json()[0]['id']

        maint = client.post(
            f'/api/equipment/{eq_id}/maintenance',
            headers=headers,
            json={
                'date': today,
                'type': 'ТО-1',
                'meter_at': 120,
                'cost': 5500,
                'next_to_interval': 250,
                'description': 'QA TO with cost',
            },
        )
        if maint.status_code not in (200, 201):
            print('FAIL: equipment TO', maint.status_code, maint.text[:400])
            return 1
        print('OK equipment TO', maint.json().get('id'), 'expense=', maint.json().get('expense_id'))

        maint_zero = client.post(
            f'/api/equipment/{eq_id}/maintenance',
            headers=headers,
            json={
                'date': today,
                'type': 'ТО-0',
                'meter_at': 121,
                'cost': 0,
                'description': 'QA TO cost=0',
            },
        )
        if maint_zero.status_code not in (200, 201):
            print('FAIL: equipment TO cost=0', maint_zero.status_code, maint_zero.text[:400])
            return 1
        if maint_zero.json().get('expense_id'):
            print('FAIL: cost=0 should not create expense')
            return 1
        print('OK equipment TO cost=0 (no expense)')

        maint_none = client.post(
            f'/api/equipment/{eq_id}/maintenance',
            headers=headers,
            json={
                'date': today,
                'type': 'осмотр',
                'meter_at': 122,
                'description': 'QA TO no cost field',
            },
        )
        if maint_none.status_code not in (200, 201):
            print('FAIL: equipment TO no cost', maint_none.status_code, maint_none.text[:400])
            return 1
        print('OK equipment TO without cost')

        implements = client.get('/api/implements', headers=headers)
        if implements.status_code != 200 or not implements.json():
            print('FAIL: implements list', implements.status_code)
            return 1
        impl_id = implements.json()[0]['id']
        imaint = client.post(
            f'/api/implements/{impl_id}/maintenance',
            headers=headers,
            json={
                'date': today,
                'type': 'сервис',
                'cost': 1800,
                'description': 'QA implement TO',
                'next_service_interval': 100,
            },
        )
        if imaint.status_code not in (200, 201):
            print('FAIL: implement TO', imaint.status_code, imaint.text[:400])
            return 1
        print('OK implement TO', imaint.json().get('id'), 'expense=', imaint.json().get('expense_id'))

        imaint_none = client.post(
            f'/api/implements/{impl_id}/maintenance',
            headers=headers,
            json={
                'date': today,
                'type': 'осмотр',
                'description': 'QA implement TO no cost',
            },
        )
        if imaint_none.status_code not in (200, 201):
            print('FAIL: implement TO no cost', imaint_none.status_code, imaint_none.text[:400])
            return 1
        print('OK implement TO without cost')

    print('smoke_finance_to: all checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
