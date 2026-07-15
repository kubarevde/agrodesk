"""Quick DB audit script for AgroDesk."""
import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

TABLES = [
    'employees', 'shifts', 'work_types', 'locations', 'equipment', 'organizations',
    'employee_rates', 'superadmin_users', 'implements', 'inventory_items',
    'equipment_meter_logs', 'equipment_maintenance', 'implement_maintenance',
    'sharing_listings', 'sharing_requests', 'notifications', 'agro_plan', 'expenses',
]

async def main() -> None:
    async with AsyncSessionLocal() as db:
        print('=== ALEMBIC ===')
        r = await db.execute(text('SELECT version_num FROM alembic_version'))
        print('version:', r.scalar())

        print('\n=== TABLE COUNTS ===')
        for t in TABLES:
            try:
                c = await db.execute(text(f'SELECT count(*) FROM {t}'))
                print(f'{t}: {c.scalar()}')
            except Exception as e:
                print(f'{t}: ERROR - {type(e).__name__}: {e}')

        print('\n=== EMPLOYEES ===')
        r = await db.execute(text(
            'SELECT employee_code, role, telegram_id, hourly_rate FROM employees ORDER BY employee_code'
        ))
        for row in r.fetchall():
            print(row)

        print('\n=== EMPLOYEE_RATES ===')
        r = await db.execute(text(
            'SELECT e.employee_code, er.rate, er.work_type_id, er.overtime_threshold_hours '
            'FROM employee_rates er JOIN employees e ON e.id = er.employee_id'
        ))
        for row in r.fetchall():
            print(row)

        print('\n=== SHIFTS BY STATUS ===')
        r = await db.execute(text('SELECT status, count(*) FROM shifts GROUP BY status'))
        for row in r.fetchall():
            print(row)

        print('\n=== SHIFTS WITH calculated_amount ===')
        r = await db.execute(text(
            'SELECT count(*) FROM shifts WHERE calculated_amount IS NOT NULL'
        ))
        print('with amount:', r.scalar())

        print('\n=== FIELDS (locations with crop) ===')
        r = await db.execute(text(
            "SELECT count(*) FROM locations WHERE crop_type IS NOT NULL OR name LIKE 'Поле%'"
        ))
        print('fields:', r.scalar())

        print('\n=== EQUIPMENT meter_type ===')
        r = await db.execute(text(
            'SELECT meter_type, count(*) FROM equipment GROUP BY meter_type'
        ))
        for row in r.fetchall():
            print(row)

        print('\n=== COLUMN CHECKS ===')
        checks = [
            ("employees.telegram_id", "SELECT data_type FROM information_schema.columns WHERE table_name='employees' AND column_name='telegram_id'"),
            ("shifts.calculated_amount", "SELECT data_type FROM information_schema.columns WHERE table_name='shifts' AND column_name='calculated_amount'"),
            ("shifts.rate_snapshot", "SELECT data_type FROM information_schema.columns WHERE table_name='shifts' AND column_name='rate_snapshot'"),
        ]
        for label, sql in checks:
            r = await db.execute(text(sql))
            print(f'{label}: {r.scalar()}')

if __name__ == '__main__':
    asyncio.run(main())
