import time
import httpx

BASE = 'http://localhost:8000'
c = httpx.Client(timeout=120)
t = c.post(f'{BASE}/api/auth/login', json={'employee_code': 'EMP001', 'password': '1234'}).json()['access_token']
h = {'Authorization': f'Bearer {t}'}
eq = c.get(f'{BASE}/api/equipment', headers=h).json()
kult = next(e for e in eq if e['name'] == 'Культиватор КПС-4')
loc = c.get(f'{BASE}/api/locations', headers=h).json()
loc = next(l for l in loc if l['is_active'] and 'Поле' in l['name'])
wt = c.get(f'{BASE}/api/work-types', headers=h).json()[0]

logs_before = c.get(f'{BASE}/api/equipment/{kult["id"]}/meter-logs', headers=h).json()
print('logs before', len(logs_before))

r = c.post(
    f'{BASE}/api/shifts',
    headers=h,
    json={'location_id': loc['id'], 'work_type_id': wt['id'], 'equipment_id': kult['id']},
)
print('open', r.status_code)
if r.status_code == 201:
    sid = r.json()['id']
    print('waiting 65s for duration...')
    time.sleep(65)
    cr = c.post(
        f'{BASE}/api/shifts/{sid}/close',
        headers=h,
        json={'description': 'Kultivator shift_hours test'},
    )
    print('close', cr.status_code, cr.json().get('duration_rounded'))
    logs_after = c.get(f'{BASE}/api/equipment/{kult["id"]}/meter-logs', headers=h).json()
    auto = [l for l in logs_after if l.get('source') == 'shift']
    print('auto logs', len(auto), 'new total', len(logs_after))
