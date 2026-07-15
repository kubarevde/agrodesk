"""API smoke audit for AgroDesk."""
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = 'http://127.0.0.1:8000'


def req(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, object]:
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(body).encode() if body is not None else None
    request = Request(f'{BASE}{path}', data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=15) as resp:
            raw = resp.read().decode()
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw[:200]
    except HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw[:200]
    except URLError as e:
        return 0, str(e.reason)


def login(email: str, password: str, org_id: str) -> str | None:
    code, data = req('POST', '/api/auth/login', {'email': email, 'password': password, 'org_id': org_id})
    if code == 200 and isinstance(data, dict):
        return data.get('access_token')
    print(f'LOGIN FAIL {email}: {code} {data}')
    return None


def main() -> None:
    results: list[tuple[str, str, str]] = []

    def record(name: str, ok: bool, detail: str) -> None:
        results.append((name, 'OK' if ok else 'ERROR', detail))

    code, health = req('GET', '/health')
    record('GET /health', code == 200, str(health))

    code, orgs = req('GET', '/api/auth/orgs')
    record('GET /api/auth/orgs', code == 200 and isinstance(orgs, list) and len(orgs) > 0, f'{code} count={len(orgs) if isinstance(orgs, list) else orgs}')

    if not isinstance(orgs, list) or not orgs:
        print('Cannot continue without org')
        for r in results:
            print(r)
        sys.exit(1)

    org_id = orgs[0]['id']

    code, _ = req('GET', '/api/employees')
    record('GET /api/employees no token', code == 401, str(code))

    admin_token = login('EMP000', '1234', org_id)
    record('POST /api/auth/login admin', admin_token is not None, 'token ok' if admin_token else 'fail')

    emp_token = login('EMP001', '1234', org_id)
    record('POST /api/auth/login employee', emp_token is not None, 'token ok' if emp_token else 'fail')

    if admin_token:
        code, stats = req('GET', '/api/dashboard/stats', token=admin_token)
        has_fields = isinstance(stats, dict) and 'monthSalaryTotal' in stats or (isinstance(stats, dict) and 'month_salary_total' in stats)
        if isinstance(stats, dict):
            keys = list(stats.keys())[:8]
            record('GET /api/dashboard/stats', code == 200, f'{code} keys sample={keys}')
            mst = stats.get('monthSalaryTotal') or stats.get('month_salary_total')
            nr = stats.get('noRateShiftsCount') or stats.get('no_rate_shifts_count')
            record('dashboard month_salary_total', mst is not None, str(mst))
            record('dashboard no_rate_shifts_count', nr is not None, str(nr))
        else:
            record('GET /api/dashboard/stats', False, str(stats))

        code, preview = req('GET', '/api/reports/salary-preview?month=2026-07', token=admin_token)
        record('GET /api/reports/salary-preview', code == 200, str(code))

        code, emps = req('GET', '/api/employees', token=admin_token)
        record('GET /api/employees', code == 200 and isinstance(emps, list), f'{code} count={len(emps) if isinstance(emps, list) else emps}')

        code, shifts = req('GET', '/api/shifts', token=admin_token)
        record('GET /api/shifts', code == 200, str(code))

        code, fields = req('GET', '/api/fields', token=admin_token)
        record('GET /api/fields', code == 200, str(code))

        code, notif = req('GET', '/api/notifications/count', token=admin_token)
        record('GET /api/notifications/count', code == 200, str(code))

        code, plans = req('GET', '/api/agro-plan', token=admin_token)
        record('GET /api/agro-plan', code == 200, str(code))

        code, listings = req('GET', '/api/sharing/listings', token=admin_token)
        record('GET /api/sharing/listings', code == 200, str(code))

    if emp_token:
        code, me = req('GET', '/api/employees/me', token=emp_token)
        record('GET /api/employees/me', code == 200, str(code))
        code, earn = req('GET', '/api/employees/me/earnings?month=2026-07', token=emp_token)
        record('GET /api/employees/me/earnings', code == 200, str(code))

    # bot token
    code, bot = req('POST', '/api/auth/bot-token', {'telegram_id': 111111111, 'secret': 'agrodesk-bot-secret-change-me'})
    record('POST /api/auth/bot-token', code == 200, str(code))

    print('\n=== API AUDIT ===')
    for name, status, detail in results:
        print(f'{status:5} | {name} | {detail}')

    errors = sum(1 for _, s, _ in results if s == 'ERROR')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
