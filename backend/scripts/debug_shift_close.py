import httpx
import time

BASE = 'http://localhost:8001'
c = httpx.Client(timeout=30)
t1 = c.post(f'{BASE}/api/auth/login', json={'employee_code': 'EMP001', 'password': '1234'}).json()['access_token']
t3 = c.post(f'{BASE}/api/auth/login', json={'employee_code': 'EMP003', 'password': '1234'}).json()['access_token']
h1 = {'Authorization': f'Bearer {t1}'}
h3 = {'Authorization': f'Bearer {t3}'}
loc = c.get(f'{BASE}/api/locations', headers=h3).json()
loc = next(l for l in loc if l['is_active'] and 'Поле' in l['name'])
wt = c.get(f'{BASE}/api/work-types', headers=h3).json()[0]
eq = c.get(f'{BASE}/api/equipment', headers=h3).json()
mtz = next(e for e in eq if e['name'] == 'МТЗ-82')

open_shifts = c.get(f'{BASE}/api/shifts', headers=h3, params={'status': 'open'}).json()
print('open shifts', len(open_shifts))
for s in open_shifts:
    hdr = h1 if s.get('employee_code') == 'EMP001' else h3
    r = c.post(
        f"{BASE}/api/shifts/{s['id']}/close",
        headers=hdr,
        json={'description': 'cleanup open shift'},
    )
    print('close', s['id'], r.status_code, r.text[:500])

r = c.post(
    f'{BASE}/api/shifts',
    headers=h1,
    json={'location_id': loc['id'], 'work_type_id': wt['id'], 'equipment_id': mtz['id']},
)
print('open', r.status_code, r.text[:200])
if r.status_code == 201:
    sid = r.json()['id']
    time.sleep(0.5)
    cr = c.post(
        f'{BASE}/api/shifts/{sid}/close',
        headers=h1,
        json={'description': 'test close shift'},
    )
    print('close new', cr.status_code, cr.text[:500])
