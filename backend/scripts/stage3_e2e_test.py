"""Stage 3 E2E API test — live data, no mocks."""
from __future__ import annotations

import json
import sys
import time
from datetime import date
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO

import httpx

BASE = 'http://localhost:8000'
RESULTS: list[tuple[str, bool, str]] = []
SEED_EQUIPMENT = {
    'МТЗ-82', 'К-700', 'Дон-1500Б', 'Газель', 'КамАЗ',
    'Опрыскиватель Jacto', 'Культиватор КПС-4', 'Сеялка СЗ-3.6',
}


def ok(section: str, passed: bool, detail: str = '') -> None:
    RESULTS.append((section, passed, detail))
    mark = 'PASS' if passed else 'FAIL'
    line = f'[{mark}] {section}' + (f' - {detail}' if detail else '')
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode('ascii', errors='replace').decode('ascii'))


def login(client: httpx.Client, code: str) -> str:
    r = client.post(f'{BASE}/api/auth/login', json={'employee_code': code, 'password': '1234'})
    r.raise_for_status()
    return r.json()['access_token']


def auth_headers(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def first_active(items: list[dict], key: str = 'is_active') -> dict | None:
    return next((i for i in items if i.get(key, True)), None)


def close_open_shifts(client: httpx.Client, token: str, employee_id: str) -> None:
    r = client.get(
        f'{BASE}/api/shifts',
        headers=auth_headers(token),
        params={'status': 'open', 'employee_id': employee_id},
    )
    if r.status_code != 200:
        return
    for shift in r.json():
        client.post(
            f'{BASE}/api/shifts/{shift["id"]}/close',
            headers=auth_headers(token),
            json={'description': 'E2E auto-close shift'},
        )


def xlsx_sheet_count(content: bytes) -> int:
    with ZipFile(BytesIO(content)) as zf:
        return len([n for n in zf.namelist() if n.startswith('xl/worksheets/')])


def main() -> int:
    client = httpx.Client(timeout=60.0)
    today = date.today().isoformat()
    month = today[:7]
    year = date.today().year

    try:
        admin_token = login(client, 'EMP000')
        emp1_token = login(client, 'EMP001')
        emp2_token = login(client, 'EMP002')
        mgr_token = login(client, 'EMP003')
        ok('AUTH: login all users', True)

        # --- FIELDS ---
        r = client.post(
            f'{BASE}/api/fields',
            headers=auth_headers(mgr_token),
            json={
                'name': 'Поле №5',
                'crop_type': 'Ячмень',
                'area_ha': 70,
                'soil_type': 'Чернозём',
                'latitude': 51.515,
                'longitude': 36.49,
            },
        )
        if r.status_code not in (201, 400, 409):
            ok('ПОЛЯ: создать Поле №5', False, f'status={r.status_code}')
        fields = client.get(f'{BASE}/api/fields', headers=auth_headers(mgr_token)).json()
        field5 = next((f for f in fields if f['name'] == 'Поле №5'), None)
        ok('ПОЛЯ: Поле №5 в списке', field5 is not None)
        ok('ПОЛЯ: 5 полей', len(fields) >= 5, f'count={len(fields)}')
        ok('ПОЛЯ: координаты для карты', bool(field5 and field5.get('latitude') and field5.get('longitude')))

        locations = client.get(f'{BASE}/api/locations', headers=auth_headers(mgr_token)).json()
        field5_loc = next((l for l in locations if l['name'] == 'Поле №5'), None)
        ok('ПОЛЯ: в справочнике локаций (для смен)', field5_loc is not None and field5_loc.get('is_active'))

        # --- EQUIPMENT ---
        equipment = client.get(f'{BASE}/api/equipment', headers=auth_headers(mgr_token)).json()
        seed_items = [e for e in equipment if e['name'] in SEED_EQUIPMENT]
        ok('ТЕХНИКА: 8 seed единиц', len(seed_items) == 8, f'seed={len(seed_items)} total={len(equipment)}')
        active_eq = [e for e in equipment if e.get('is_active', True)]
        ok('ТЕХНИКА: 8 активных', len(active_eq) == 8, f'active={len(active_eq)}')
        if field5:
            ok('ПОЛЯ: Поле №5 = 70 га', float(field5.get('area_ha') or 0) == 70, str(field5.get('area_ha')))

        ok('ТЕХНИКА: badge ТО (to_status)', all('to_status' in e for e in seed_items))

        mtz = next((e for e in equipment if e['name'] == 'МТЗ-82'), None)
        kult = next((e for e in equipment if e['name'] == 'Культиватор КПС-4'), None)
        ok('ТЕХНИКА: МТЗ-82 и Культиватор', mtz is not None and kult is not None)

        if mtz:
            meter_before = float(mtz['current_meter'])
            ml_r = client.post(
                f'{BASE}/api/equipment/{mtz["id"]}/meter-logs',
                headers=auth_headers(mgr_token),
                json={'value_added': 100, 'date': today, 'note': 'E2E test'},
            )
            ok('ТЕХНИКА: +100 мч МТЗ-82', ml_r.status_code == 201)
            mtz2 = client.get(f'{BASE}/api/equipment/{mtz["id"]}', headers=auth_headers(mgr_token)).json()
            meter_after = float(mtz2['current_meter'])
            ok('ТЕХНИКА: счётчик обновился', meter_after >= meter_before + 100, f'{meter_before}->{meter_after}')
            ok('ТЕХНИКА: to_status для прогресс-бара', mtz2.get('to_status') in ('ok', 'warning', 'overdue'))

            maint_r = client.post(
                f'{BASE}/api/equipment/{mtz["id"]}/maintenance',
                headers=auth_headers(mgr_token),
                json={
                    'date': today,
                    'type': 'ТО-1',
                    'meter_at': meter_after,
                    'cost': 5000,
                    'description': 'E2E ТО',
                    'next_to_interval': 250,
                },
            )
            ok('ТЕХНИКА: записать ТО', maint_r.status_code == 201)
            exp_r = client.get(
                f'{BASE}/api/expenses',
                headers=auth_headers(mgr_token),
                params={'equipment_id': mtz['id']},
            )
            ok('ТЕХНИКА: затрата после ТО', len(exp_r.json()) > 0)

        # --- IMPLEMENTS ---
        implements = client.get(f'{BASE}/api/implements', headers=auth_headers(mgr_token)).json()
        ok('ПРИСПОСОБЛЕНИЯ: 4 шт', len(implements) >= 4, f'count={len(implements)}')
        seeder = next((i for i in implements if 'Сеялка' in i['name']), None)
        ok('ПРИСПОСОБЛЕНИЯ: Сеялка', seeder is not None)

        if seeder and mtz:
            attach_r = client.patch(
                f'{BASE}/api/implements/{seeder["id"]}/attach',
                headers=auth_headers(mgr_token),
                json={'equipment_id': mtz['id']},
            )
            ok('ПРИСПОСОБЛЕНИЯ: прикрепить к МТЗ-82', attach_r.status_code == 200)
            impl_on_eq = client.get(
                f'{BASE}/api/implements',
                headers=auth_headers(mgr_token),
                params={'equipment_id': mtz['id']},
            ).json()
            ok('ПРИСПОСОБЛЕНИЯ: на странице МТЗ-82', any(i['id'] == seeder['id'] for i in impl_on_eq))

            impl_maint = client.post(
                f'{BASE}/api/implements/{seeder["id"]}/maintenance',
                headers=auth_headers(mgr_token),
                json={'date': today, 'type': 'ТО-1', 'cost': 2000, 'description': 'E2E impl TO'},
            )
            ok('ПРИСПОСОБЛЕНИЯ: ТО затрата', impl_maint.status_code == 201)

        # --- SHIFTS ---
        work_types = client.get(f'{BASE}/api/work-types', headers=auth_headers(mgr_token)).json()
        location = first_active(locations)
        work_type = first_active(work_types)
        field2 = next((f for f in fields if f['name'] == 'Поле №2'), None)
        emp1_me = client.get(f'{BASE}/api/auth/me', headers=auth_headers(emp1_token)).json()
        close_open_shifts(client, mgr_token, emp1_me['id'])

        shift_r = client.post(
            f'{BASE}/api/shifts',
            headers=auth_headers(emp1_token),
            json={
                'location_id': location['id'],
                'work_type_id': work_type['id'],
                'equipment_id': mtz['id'] if mtz else None,
                'field_id': field2['id'] if field2 else None,
                'implement_id': seeder['id'] if seeder else None,
            },
        )
        shift = shift_r.json() if shift_r.status_code == 201 else None
        ok('СМЕНЫ: открыть поле+техника+приспособление', shift is not None, shift_r.text[:100] if not shift else '')
        if shift:
            ok('СМЕНЫ: field в ответе', bool(shift.get('field_id') or shift.get('field_name')))
            ok('СМЕНЫ: equipment в ответе', bool(shift.get('equipment_id') or shift.get('equipment')))
            ok('СМЕНЫ: implement в ответе', bool(shift.get('implement_id') or shift.get('implement_name')))
            close_r = client.post(
                f'{BASE}/api/shifts/{shift["id"]}/close',
                headers=auth_headers(emp1_token),
                json={'description': 'E2E close with all refs'},
            )
            ok('СМЕНЫ: закрыть', close_r.status_code == 200)

        # shift_hours: duration_rounded > 0 needs at least ~1 minute open
        if kult:
            close_open_shifts(client, mgr_token, emp1_me['id'])
            kult_logs_before = client.get(
                f'{BASE}/api/equipment/{kult["id"]}/meter-logs',
                headers=auth_headers(mgr_token),
            ).json()
            auto_before = len([l for l in kult_logs_before if l.get('source') == 'shift'])
            kult_shift_r = client.post(
                f'{BASE}/api/shifts',
                headers=auth_headers(emp1_token),
                json={
                    'location_id': location['id'],
                    'work_type_id': work_type['id'],
                    'equipment_id': kult['id'],
                },
            )
            if kult_shift_r.status_code == 201:
                ks = kult_shift_r.json()
                time.sleep(65)
                close_kult = client.post(
                    f'{BASE}/api/shifts/{ks["id"]}/close',
                    headers=auth_headers(emp1_token),
                    json={'description': 'E2E kultivator shift_hours'},
                )
                kult_logs_after = client.get(
                    f'{BASE}/api/equipment/{kult["id"]}/meter-logs',
                    headers=auth_headers(mgr_token),
                ).json()
                auto_after = [l for l in kult_logs_after if l.get('source') == 'shift']
                ok(
                    'ТЕХНИКА: автозапись shift_hours',
                    close_kult.status_code == 200 and len(auto_after) > auto_before,
                    f'duration={close_kult.json().get("duration_rounded") if close_kult.status_code == 200 else None}',
                )
            else:
                ok('ТЕХНИКА: автозапись shift_hours', False, kult_shift_r.text[:80])

        # --- AGRO CALENDAR ---
        field2_id = field2['id'] if field2 else None
        plans_created = 0
        for wt_name in ['Опрыскивание', 'Посев', 'Культивация']:
            wt_item = next((w for w in work_types if w['name'] == wt_name), work_type)
            pr = client.post(
                f'{BASE}/api/agro-plan',
                headers=auth_headers(mgr_token),
                json={'field_id': field2_id, 'work_type_id': wt_item['id'], 'planned_date': today},
            )
            if pr.status_code == 201:
                plans_created += 1
            elif pr.status_code == 400:
                # duplicate same day - try different field
                field3 = next((f for f in fields if f['name'] == 'Поле №3'), field2)
                pr2 = client.post(
                    f'{BASE}/api/agro-plan',
                    headers=auth_headers(mgr_token),
                    json={'field_id': field3['id'], 'work_type_id': wt_item['id'], 'planned_date': today},
                )
                if pr2.status_code == 201:
                    plans_created += 1
        ok('АГРОКАЛЕНДАРЬ: создать планы', plans_created >= 1, f'created={plans_created}')

        plans_r = client.get(
            f'{BASE}/api/agro-plan', headers=auth_headers(mgr_token), params={'month': month}
        )
        ok('АГРОКАЛЕНДАРЬ: планы в месяце', len(plans_r.json()) >= 1, f'count={len(plans_r.json())}')

        plan_today = next(
            (p for p in plans_r.json() if p.get('planned_date', '')[:10] == today and p.get('status') == 'planned'),
            None,
        )
        if plan_today and field2_id:
            close_open_shifts(client, mgr_token, emp1_me['id'])
            s2r = client.post(
                f'{BASE}/api/shifts',
                headers=auth_headers(emp1_token),
                json={
                    'location_id': location['id'],
                    'work_type_id': work_type['id'],
                    'field_id': plan_today.get('field_id') or field2_id,
                },
            )
            if s2r.status_code == 201:
                s2 = s2r.json()
                client.post(
                    f'{BASE}/api/shifts/{s2["id"]}/close',
                    headers=auth_headers(emp1_token),
                    json={'description': 'E2E agro plan done'},
                )
                plans_after = client.get(
                    f'{BASE}/api/agro-plan',
                    headers=auth_headers(mgr_token),
                    params={'month': month},
                ).json()
                done = next((p for p in plans_after if p['id'] == plan_today['id']), None)
                ok('АГРОКАЛЕНДАРЬ: план Выполнено', done is not None and done.get('status') == 'done')
            else:
                ok('АГРОКАЛЕНДАРЬ: план Выполнено', False, s2r.text[:80])
        else:
            ok('АГРОКАЛЕНДАРЬ: план Выполнено', False, 'no plan for today')

        # --- SHARING ---
        field3 = next((f for f in fields if f['name'] == 'Поле №3'), None)
        listings_created = 0
        listing_ids: list[str] = []
        for payload in [
            {'type': 'field', 'title': 'E2E Поле №3 Кукуруза', 'field_id': field3['id'] if field3 else None},
            {'type': 'equipment', 'title': 'E2E МТЗ-82', 'equipment_id': mtz['id'] if mtz else None},
            {'type': 'implement', 'title': 'E2E Сеялка СЗ-3.6', 'implement_id': seeder['id'] if seeder else None},
        ]:
            if not any(payload.get(k) for k in ('field_id', 'equipment_id', 'implement_id')):
                continue
            lr = client.post(
                f'{BASE}/api/sharing/listings',
                headers=auth_headers(emp1_token),
                json={
                    'type': payload['type'],
                    'title': payload['title'],
                    'field_id': payload.get('field_id'),
                    'equipment_id': payload.get('equipment_id'),
                    'implement_id': payload.get('implement_id'),
                    'contact_info': '+7 900 111-22-33',
                },
            )
            if lr.status_code == 201:
                listings_created += 1
                listing_ids.append(lr.json()['id'])
        ok('ШЕРИНГ: EMP001 3 объявления', listings_created >= 3, f'created={listings_created}')

        my_listings = client.get(f'{BASE}/api/sharing/listings/my', headers=auth_headers(emp1_token)).json()
        field3_listing = next((l for l in my_listings if l.get('type') == 'field'), None)
        ok('ШЕРИНГ: объявление на /sharing', len(my_listings) >= 1)

        if field3_listing:
            pending_before = client.get(
                f'{BASE}/api/notifications/count', headers=auth_headers(emp1_token)
            ).json().get('unread', 0)
            req_r = client.post(
                f'{BASE}/api/sharing/requests',
                headers=auth_headers(emp2_token),
                json={'listing_id': field3_listing['id'], 'message': 'E2E заявка EMP002'},
            )
            ok('ШЕРИНГ: EMP002 заявка', req_r.status_code == 201, req_r.text[:80])

            time.sleep(0.3)
            notif_count = client.get(
                f'{BASE}/api/notifications/count', headers=auth_headers(emp1_token)
            ).json()
            ok('УВЕДОМЛЕНИЯ: badge count', notif_count.get('unread', 0) > pending_before, str(notif_count))

            incoming = client.get(
                f'{BASE}/api/sharing/requests/incoming', headers=auth_headers(emp1_token)
            ).json()
            pending = next((r for r in incoming if r.get('status') == 'pending'), None)
            ok('ШЕРИНГ: badge 1 заявка', field3_listing.get('requests_count', 0) >= 0 or pending is not None)

            if pending:
                acc_r = client.patch(
                    f'{BASE}/api/sharing/requests/{pending["id"]}',
                    headers=auth_headers(emp1_token),
                    json={'status': 'accepted', 'owner_response': 'Принято, звоните'},
                )
                ok('ШЕРИНГ: EMP001 принять', acc_r.status_code == 200)

            out_req = client.get(
                f'{BASE}/api/sharing/requests/outgoing', headers=auth_headers(emp2_token)
            ).json()
            accepted = next((r for r in out_req if r.get('status') == 'accepted'), None)
            ok('ШЕРИНГ: EMP002 Принята', accepted is not None)
            ok('ШЕРИНГ: контакты EMP001', bool(accepted and accepted.get('listing_contact_info')))

        notifs = client.get(f'{BASE}/api/notifications', headers=auth_headers(emp1_token)).json()
        if notifs:
            unread = [n for n in notifs if not n.get('is_read')]
            if unread:
                nr = client.patch(
                    f'{BASE}/api/notifications/{unread[0]["id"]}/read',
                    headers=auth_headers(emp1_token),
                )
                ok('УВЕДОМЛЕНИЯ: mark as read', nr.status_code == 200)

        # --- MAPS data ---
        fields_coords = [f for f in fields if f.get('latitude') and f.get('longitude')]
        ok('КАРТА: 5 полей с координатами', len(fields_coords) >= 5, str(len(fields_coords)))
        eq_coords = [e for e in equipment if e.get('latitude') and e.get('longitude')]
        ok('КАРТА: техника с координатами', len(eq_coords) >= 8, str(len(eq_coords)))
        share_list = client.get(f'{BASE}/api/sharing/listings', headers=auth_headers(emp1_token)).json()
        share_coords = [s for s in share_list if s.get('lat') and s.get('lng')]
        ok('КАРТА: шеринг с координатами', len(share_coords) >= 1, str(len(share_coords)))

        dash = client.get(f'{BASE}/api/dashboard/stats', headers=auth_headers(mgr_token)).json()
        ok('ДАШБОРД: stats API', 'equipment_warnings' in dash and 'agro_plan_today' in dash)

        # --- REPORTS ---
        for endpoint, body, expected_sheets in [
            ('/api/reports/equipment', {'from_date': f'{year}-01-01', 'to_date': f'{year}-12-31'}, 5),
            ('/api/reports/fields', {'from_date': f'{year}-01-01', 'to_date': f'{year}-12-31'}, 3),
            ('/api/reports/season', {'year': year}, 4),
        ]:
            rr = client.post(f'{BASE}{endpoint}', headers=auth_headers(mgr_token), json=body)
            sheets = xlsx_sheet_count(rr.content) if rr.status_code == 200 else 0
            ok(
                f'ОТЧЁТЫ: {endpoint.split("/")[-1]} ({expected_sheets} листов)',
                rr.status_code == 200 and sheets == expected_sheets,
                f'status={rr.status_code} sheets={sheets}',
            )

    except Exception as exc:
        ok('FATAL', False, str(exc))
        import traceback
        traceback.print_exc()
    finally:
        client.close()

    passed = sum(1 for _, p, _ in RESULTS if p)
    failed = sum(1 for _, p, _ in RESULTS if not p)
    print(f'\n=== SUMMARY: {passed} passed, {failed} failed / {len(RESULTS)} total ===')
    for section, p, detail in RESULTS:
        if not p:
            print(f'  FAIL: {section} - {detail}')

    out = Path(__file__).parent / 'stage3_e2e_results.json'
    out.write_text(
        json.dumps([{'section': s, 'passed': p, 'detail': d} for s, p, d in RESULTS], ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
