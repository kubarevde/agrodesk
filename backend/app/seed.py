import asyncio
from datetime import date, time
from decimal import Decimal

import bcrypt
from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.employee_rate import EmployeeRate
from app.models.implement import Implement
from app.models.inventory import InventoryCategory, InventoryItem
from app.models.organization import Organization
from app.models.reference import Equipment, Location, WorkType
from app.models.shift import Shift, ShiftStatus

DEFAULT_PASSWORD_HASH = bcrypt.hashpw(b'1234', bcrypt.gensalt()).decode('utf-8')

# Demo credentials — see docs/seed-users.md
DEMO_ORG_NAME = 'Demo AgroDesk'
DEMO_ORG_SLUG = 'demo'
DEMO_OWNER_EMAIL = 'admin@demo.agrodesk'
DEMO_BOT_TELEGRAM_ID = 111111111

TEST_ORG_NAME = 'Тестовое хозяйство'
TEST_ORG_SLUG = 'test-farm'
TEST_OWNER_EMAIL = 'admin@test-farm.agrodesk'
TEST_ADMIN_CODE = 'EMP-TEST'

LOCATIONS = [
    ('Поле №1', 'Пшеница'),
    ('Поле №2', 'Подсолнечник'),
    ('Поле №3', 'Кукуруза'),
    ('Поле №4', 'Озимые'),
    ('Зернохранилище', None),
    ('Мастерская', None),
    ('Административный корпус', None),
]

# name, crop_type, area_ha, soil_type, latitude, longitude
FIELD_SEED = [
    ('Поле №1', 'Пшеница', Decimal('120'), 'Чернозём', Decimal('51.5200'), Decimal('36.4800')),
    ('Поле №2', 'Подсолнечник', Decimal('85'), 'Суглинистая', Decimal('51.5100'), Decimal('36.5200')),
    ('Поле №3', 'Кукуруза', Decimal('200'), 'Чернозём', Decimal('51.4900'), Decimal('36.5000')),
    ('Поле №4', 'Озимые', Decimal('150'), 'Супесчаная', Decimal('51.5000'), Decimal('36.4500')),
]

WORK_TYPES = [
    ('Посев', 'полевые работы'),
    ('Уборка урожая', 'полевые работы'),
    ('Культивация', 'полевые работы'),
    ('Боронование', 'полевые работы'),
    ('Опрыскивание', 'полевые работы'),
    ('Ремонт техники', 'обслуживание'),
    ('Разгрузка/погрузка', 'логистика'),
    ('Полив', 'полевые работы'),
]

EQUIPMENT = [
    # name, type, meter_type, to_interval, current_meter, lat, lng
    ('МТЗ-82', 'Трактор', 'motohours', Decimal('250'), Decimal('1240'), Decimal('51.512340'), Decimal('36.241120')),
    ('К-700', 'Трактор', 'motohours', Decimal('500'), Decimal('3120'), Decimal('51.521800'), Decimal('36.265400')),
    ('Дон-1500Б', 'Комбайн', 'motohours', Decimal('250'), Decimal('890'), Decimal('51.498200'), Decimal('36.228900')),
    ('Газель', 'Грузовик', 'km', Decimal('10000'), Decimal('87400'), Decimal('51.535100'), Decimal('36.251300')),
    ('КамАЗ', 'Грузовик', 'km', Decimal('15000'), Decimal('124000'), Decimal('51.490500'), Decimal('36.279800')),
    ('Опрыскиватель Jacto', 'Спецтехника', 'shift_hours', Decimal('200'), Decimal('45'), Decimal('51.518900'), Decimal('36.210400')),
    ('Культиватор КПС-4', 'Спецтехника', 'shift_hours', Decimal('150'), Decimal('78'), Decimal('51.505600'), Decimal('36.255700')),
    ('Сеялка СЗ-3.6', 'Спецтехника', 'shift_hours', Decimal('100'), Decimal('32'), Decimal('51.527400'), Decimal('36.232100')),
]

# code, full_name, position, role, hourly_rate, telegram_id
EMPLOYEES = [
    ('EMP000', 'Администратор', None, EmployeeRole.admin, Decimal('0'), None),
    (
        'EMP001',
        'Иванов Сергей Николаевич',
        'тракторист',
        EmployeeRole.employee,
        Decimal('250'),
        DEMO_BOT_TELEGRAM_ID,
    ),
    ('EMP002', 'Петров Александр Иванович', 'комбайнёр', EmployeeRole.employee, Decimal('300'), None),
    ('EMP003', 'Сидорова Мария Петровна', 'агроном', EmployeeRole.manager, Decimal('350'), None),
    ('EMP004', 'Козлов Дмитрий Сергеевич', 'водитель', EmployeeRole.employee, Decimal('200'), None),
    ('EMP005', 'Новиков Алексей Владимирович', 'разнорабочий', EmployeeRole.employee, Decimal('180'), None),
]

INVENTORY_ITEMS = [
    ('Дизельное топливо', InventoryCategory.fuel, 'л', Decimal('2340'), Decimal('500'), Decimal('5000')),
    ('Аммиачная селитра', InventoryCategory.fertilizer, 'кг', Decimal('1200'), Decimal('300'), Decimal('3000')),
    ('Подсолнечник семена', InventoryCategory.seeds, 'кг', Decimal('850'), Decimal('200'), Decimal('2000')),
    ('Гербицид Балерина', InventoryCategory.chemicals, 'л', Decimal('45'), Decimal('50'), Decimal('500')),
    ('Масло моторное М-10', InventoryCategory.parts, 'л', Decimal('80'), Decimal('100'), Decimal('300')),
    ('Запчасти МТЗ', InventoryCategory.parts, 'шт', Decimal('5'), Decimal('5'), Decimal('20')),
    ('Пшеница семенная', InventoryCategory.seeds, 'кг', Decimal('4500'), Decimal('1000'), Decimal('5000')),
    ('Аммофос', InventoryCategory.fertilizer, 'кг', Decimal('600'), Decimal('200'), Decimal('1500')),
]

# name, category, condition, year, serial
IMPLEMENTS = [
    ('Сеялка СЗ-3.6', 'Посевная', 'good', 2018, 'SZ-3600-01'),
    ('Опрыскиватель навесной', 'Опрыскивание', 'fair', 2019, 'SPR-1100'),
    ('Плуг ПЛН-3-35', 'Обработка почвы', 'good', 2015, 'PLN-335'),
    ('Жатка 6 метров', 'Уборочная', 'repair', 2016, 'HT-6M'),
]


async def is_table_empty(session, model) -> bool:
    result = await session.scalar(select(func.count()).select_from(model))
    return (result or 0) == 0


async def get_or_create_demo_org(session) -> Organization:
    for slug in (DEMO_ORG_SLUG, 'main'):
        result = await session.execute(select(Organization).where(Organization.slug == slug))
        org = result.scalar_one_or_none()
        if org is not None:
            changed = False
            if org.owner_email != DEMO_OWNER_EMAIL:
                org.owner_email = DEMO_OWNER_EMAIL
                changed = True
            # Existing DBs from migration use slug=main — show friendly demo name
            if org.name in ('Основная организация', '') or (
                org.slug in (DEMO_ORG_SLUG, 'main') and org.name != DEMO_ORG_NAME
            ):
                org.name = DEMO_ORG_NAME
                changed = True
            if changed:
                session.add(org)
                await session.commit()
                await session.refresh(org)
            return org

    org = Organization(
        name=DEMO_ORG_NAME,
        slug=DEMO_ORG_SLUG,
        owner_email=DEMO_OWNER_EMAIL,
        plan='trial',
        is_active=True,
        max_employees=50,
    )
    session.add(org)
    await session.commit()
    await session.refresh(org)
    print(f'organizations: created {DEMO_ORG_SLUG}')
    return org


async def seed_locations(session, org_id) -> None:
    if not await is_table_empty(session, Location):
        await update_field_seed(session, org_id)
        return

    session.add_all(
        [
            Location(org_id=org_id, name=name, description=description, is_active=True)
            for name, description in LOCATIONS
        ]
    )
    await session.commit()
    await update_field_seed(session, org_id)
    print(f'locations: seeded {len(LOCATIONS)} rows')


async def update_field_seed(session, org_id=None) -> None:
    updated = 0
    for name, crop_type, area_ha, soil_type, latitude, longitude in FIELD_SEED:
        query = select(Location).where(Location.name == name)
        if org_id is not None:
            query = query.where(Location.org_id == org_id)
        result = await session.execute(query)
        item = result.scalar_one_or_none()
        if item is None:
            continue
        item.crop_type = crop_type
        item.area_ha = area_ha
        item.soil_type = soil_type
        item.latitude = latitude
        item.longitude = longitude
        item.description = item.description or crop_type
        session.add(item)
        updated += 1
    await session.commit()
    print(f'fields: updated seed data for {updated} rows')


async def seed_work_types(session, org_id) -> None:
    if not await is_table_empty(session, WorkType):
        print('work_types: skip (already seeded)')
        return

    session.add_all(
        [
            WorkType(org_id=org_id, name=name, category=category, is_active=True)
            for name, category in WORK_TYPES
        ]
    )
    await session.commit()
    print(f'work_types: seeded {len(WORK_TYPES)} rows')


async def seed_equipment(session, org_id) -> None:
    if await is_table_empty(session, Equipment):
        session.add_all(
            [
                Equipment(
                    org_id=org_id,
                    name=name,
                    type=equipment_type,
                    meter_type=meter_type,
                    to_interval=to_interval,
                    current_meter=current_meter,
                    next_to_at=current_meter + to_interval,
                    latitude=latitude,
                    longitude=longitude,
                    is_active=True,
                )
                for name, equipment_type, meter_type, to_interval, current_meter, latitude, longitude in EQUIPMENT
            ]
        )
        await session.commit()
        print(f'equipment: seeded {len(EQUIPMENT)} rows')
        return

    # Update meters on existing seed rows (Stage 3 fields).
    result = await session.execute(select(Equipment))
    by_name = {item.name: item for item in result.scalars().all()}
    updated = 0
    for name, equipment_type, meter_type, to_interval, current_meter, latitude, longitude in EQUIPMENT:
        item = by_name.get(name)
        if item is None:
            continue
        item.type = equipment_type
        item.meter_type = meter_type
        item.to_interval = to_interval
        item.current_meter = current_meter
        item.next_to_at = current_meter + to_interval
        item.latitude = latitude
        item.longitude = longitude
        updated += 1
    await session.commit()
    print(f'equipment: updated meters for {updated} rows')


async def seed_employees(session, org_id) -> None:
    if await is_table_empty(session, Employee):
        session.add_all(
            [
                Employee(
                    org_id=org_id,
                    employee_code=code,
                    full_name=full_name,
                    position=position,
                    role=role,
                    hourly_rate=hourly_rate,
                    telegram_id=telegram_id,
                    password_hash=DEFAULT_PASSWORD_HASH,
                    is_active=True,
                )
                for code, full_name, position, role, hourly_rate, telegram_id in EMPLOYEES
            ]
        )
        await session.commit()
        print(f'employees: seeded {len(EMPLOYEES)} rows')
    else:
        print('employees: skip create (already seeded)')

    await ensure_demo_employee_links(session, org_id)


async def ensure_demo_employee_links(session, org_id) -> None:
    """Keep demo bot telegram_id and admin login alias stable across re-seeds."""
    result = await session.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.employee_code == 'EMP001',
        )
    )
    employee = result.scalar_one_or_none()
    if employee is not None and employee.telegram_id != DEMO_BOT_TELEGRAM_ID:
        employee.telegram_id = DEMO_BOT_TELEGRAM_ID
        session.add(employee)
        await session.commit()
        print(f'employees: EMP001 telegram_id → {DEMO_BOT_TELEGRAM_ID}')

    if employee is not None:
        rate_exists = await session.scalar(
            select(func.count())
            .select_from(EmployeeRate)
            .where(
                EmployeeRate.org_id == org_id,
                EmployeeRate.employee_id == employee.id,
                EmployeeRate.work_type_id.is_(None),
            )
        )
        if int(rate_exists or 0) == 0:
            session.add(
                EmployeeRate(
                    org_id=org_id,
                    employee_id=employee.id,
                    work_type_id=None,
                    rate=Decimal('250'),
                    overtime_threshold_hours=Decimal('8'),
                    overtime_multiplier=Decimal('1.5'),
                )
            )
            await session.commit()
            print('employee_rates: seeded base rate for EMP001')

    emp002_result = await session.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.employee_code == 'EMP002',
        )
    )
    emp002 = emp002_result.scalar_one_or_none()
    if emp002 is not None:
        rate_exists = await session.scalar(
            select(func.count())
            .select_from(EmployeeRate)
            .where(
                EmployeeRate.org_id == org_id,
                EmployeeRate.employee_id == emp002.id,
                EmployeeRate.work_type_id.is_(None),
            )
        )
        if int(rate_exists or 0) == 0:
            session.add(
                EmployeeRate(
                    org_id=org_id,
                    employee_id=emp002.id,
                    work_type_id=None,
                    rate=Decimal('300'),
                    overtime_threshold_hours=Decimal('8'),
                    overtime_multiplier=Decimal('1.5'),
                )
            )
            await session.commit()
            print('employee_rates: seeded base rate for EMP002')


async def ensure_test_farm_org(session) -> None:
    """Second org for multi-tenant UI demos."""
    result = await session.execute(
        select(Organization).where(Organization.slug == TEST_ORG_SLUG)
    )
    org = result.scalar_one_or_none()
    if org is None:
        org = Organization(
            name=TEST_ORG_NAME,
            slug=TEST_ORG_SLUG,
            owner_email=TEST_OWNER_EMAIL,
            plan='trial',
            is_active=True,
            max_employees=20,
        )
        session.add(org)
        await session.commit()
        await session.refresh(org)
        print(f'organizations: created {TEST_ORG_SLUG}')

    admin_result = await session.execute(
        select(Employee).where(
            Employee.org_id == org.id,
            Employee.employee_code == TEST_ADMIN_CODE,
        )
    )
    admin = admin_result.scalar_one_or_none()
    if admin is None:
        session.add(
            Employee(
                org_id=org.id,
                employee_code=TEST_ADMIN_CODE,
                full_name='Администратор тест',
                position='администратор',
                role=EmployeeRole.admin,
                hourly_rate=Decimal('0'),
                telegram_id=None,
                password_hash=DEFAULT_PASSWORD_HASH,
                is_active=True,
            )
        )
        await session.commit()
        print(f'employees: created {TEST_ADMIN_CODE} in {TEST_ORG_SLUG}')

    loc_result = await session.execute(
        select(Location).where(
            Location.org_id == org.id,
            Location.name == 'Поле Т1',
        )
    )
    location = loc_result.scalar_one_or_none()
    if location is None:
        session.add(
            Location(
                org_id=org.id,
                name='Поле Т1',
                description='Тестовое поле',
                is_active=True,
            )
        )
        await session.commit()
        print(f'locations: created Поле Т1 in {TEST_ORG_SLUG}')


async def ensure_demo_open_shift(session, org_id) -> None:
    """Create one OPEN shift in demo org if none exist."""
    open_count = await session.scalar(
        select(func.count())
        .select_from(Shift)
        .where(Shift.org_id == org_id, Shift.status == ShiftStatus.open)
    )
    if int(open_count or 0) > 0:
        return

    for code in ('EMP004', 'EMP002', 'EMP001'):
        emp_result = await session.execute(
            select(Employee).where(
                Employee.org_id == org_id,
                Employee.employee_code == code,
            )
        )
        employee = emp_result.scalar_one_or_none()
        if employee is not None:
            break
    else:
        print('shifts: skip open shift (no employee)')
        return

    location = (
        await session.execute(
            select(Location).where(Location.org_id == org_id, Location.is_active.is_(True)).limit(1)
        )
    ).scalar_one_or_none()
    work_type = (
        await session.execute(
            select(WorkType).where(WorkType.org_id == org_id, WorkType.is_active.is_(True)).limit(1)
        )
    ).scalar_one_or_none()
    if location is None or work_type is None:
        print('shifts: skip open shift (missing location/work_type)')
        return

    now = date.today()
    session.add(
        Shift(
            org_id=org_id,
            date=now,
            employee_id=employee.id,
            start_time=time(8, 0, 0),
            end_time=None,
            work_type_id=work_type.id,
            location_id=location.id,
            description='',
            comment='',
            status=ShiftStatus.open,
        )
    )
    await session.commit()
    print(f'shifts: created open shift for {employee.employee_code}')


async def seed_inventory_items(session, org_id) -> None:
    if not await is_table_empty(session, InventoryItem):
        print('inventory_items: skip (already seeded)')
        return

    session.add_all(
        [
            InventoryItem(
                org_id=org_id,
                name=name,
                category=category,
                unit=unit,
                current_stock=current_stock,
                min_stock=min_stock,
                total_capacity=total_capacity,
                is_active=True,
            )
            for name, category, unit, current_stock, min_stock, total_capacity in INVENTORY_ITEMS
        ]
    )
    await session.commit()
    print(f'inventory_items: seeded {len(INVENTORY_ITEMS)} rows')


async def seed_implements(session, org_id) -> None:
    if await is_table_empty(session, Implement):
        session.add_all(
            [
                Implement(
                    org_id=org_id,
                    name=name,
                    category=category,
                    condition=condition,
                    year_of_manufacture=year,
                    serial_number=serial,
                    is_active=True,
                )
                for name, category, condition, year, serial in IMPLEMENTS
            ]
        )
        await session.commit()
        print(f'implements: seeded {len(IMPLEMENTS)} rows')

    # Attach a few implements to equipment for UI demos.
    equip_result = await session.execute(select(Equipment).where(Equipment.org_id == org_id))
    equip_by_name = {item.name: item for item in equip_result.scalars().all()}
    impl_result = await session.execute(select(Implement).where(Implement.org_id == org_id))
    impl_by_name = {item.name: item for item in impl_result.scalars().all()}
    attachments = [
        ('Сеялка СЗ-3.6', 'МТЗ-82'),
        ('Опрыскиватель навесной', 'МТЗ-82'),
        ('Плуг ПЛН-3-35', 'К-700'),
    ]
    attached = 0
    for impl_name, equip_name in attachments:
        impl = impl_by_name.get(impl_name)
        equip = equip_by_name.get(equip_name)
        if impl is None or equip is None:
            continue
        if impl.current_equipment_id is None:
            impl.current_equipment_id = equip.id
            attached += 1
    if attached:
        await session.commit()
        print(f'implements: attached {attached} to equipment')
    else:
        print('implements: attachments already set or missing rows')


async def ensure_demo_data() -> None:
    """Idempotent demo bootstrap used by CLI seed and API startup."""
    async with AsyncSessionLocal() as session:
        org = await get_or_create_demo_org(session)
        await seed_locations(session, org.id)
        await seed_work_types(session, org.id)
        await seed_equipment(session, org.id)
        await seed_employees(session, org.id)
        await seed_inventory_items(session, org.id)
        await seed_implements(session, org.id)
        await ensure_demo_open_shift(session, org.id)
        await ensure_test_farm_org(session)

    print('Seed completed.')


async def main() -> None:
    await ensure_demo_data()


if __name__ == '__main__':
    asyncio.run(main())
