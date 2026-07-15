import asyncio
from decimal import Decimal

import bcrypt
from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.implement import Implement
from app.models.inventory import InventoryCategory, InventoryItem
from app.models.organization import Organization
from app.models.reference import Equipment, Location, WorkType

DEFAULT_PASSWORD_HASH = bcrypt.hashpw(b'1234', bcrypt.gensalt()).decode('utf-8')

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

EMPLOYEES = [
    ('EMP000', 'Администратор', None, EmployeeRole.admin, Decimal('0')),
    ('EMP001', 'Иванов Сергей Николаевич', 'тракторист', EmployeeRole.employee, Decimal('250')),
    ('EMP002', 'Петров Александр Иванович', 'комбайнёр', EmployeeRole.employee, Decimal('300')),
    ('EMP003', 'Сидорова Мария Петровна', 'агроном', EmployeeRole.manager, Decimal('350')),
    ('EMP004', 'Козлов Дмитрий Сергеевич', 'водитель', EmployeeRole.employee, Decimal('200')),
    ('EMP005', 'Новиков Алексей Владимирович', 'разнорабочий', EmployeeRole.employee, Decimal('180')),
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


async def get_or_create_main_org(session) -> Organization:
    result = await session.execute(select(Organization).where(Organization.slug == 'main'))
    org = result.scalar_one_or_none()
    if org is not None:
        return org
    org = Organization(name='Основная организация', slug='main')
    session.add(org)
    await session.commit()
    await session.refresh(org)
    print('organizations: created main')
    return org


async def seed_locations(session, org_id) -> None:
    if not await is_table_empty(session, Location):
        await update_field_seed(session)
        return

    session.add_all(
        [
            Location(org_id=org_id, name=name, description=description, is_active=True)
            for name, description in LOCATIONS
        ]
    )
    await session.commit()
    await update_field_seed(session)
    print(f'locations: seeded {len(LOCATIONS)} rows')


async def update_field_seed(session) -> None:
    updated = 0
    for name, crop_type, area_ha, soil_type, latitude, longitude in FIELD_SEED:
        result = await session.execute(select(Location).where(Location.name == name))
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
    if not await is_table_empty(session, Employee):
        print('employees: skip (already seeded)')
        return

    session.add_all(
        [
            Employee(
                org_id=org_id,
                employee_code=code,
                full_name=full_name,
                position=position,
                role=role,
                hourly_rate=hourly_rate,
                password_hash=DEFAULT_PASSWORD_HASH,
                is_active=True,
            )
            for code, full_name, position, role, hourly_rate in EMPLOYEES
        ]
    )
    await session.commit()
    print(f'employees: seeded {len(EMPLOYEES)} rows')


async def seed_inventory_items(session) -> None:
    if not await is_table_empty(session, InventoryItem):
        print('inventory_items: skip (already seeded)')
        return

    session.add_all(
        [
            InventoryItem(
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


async def seed_implements(session) -> None:
    if await is_table_empty(session, Implement):
        session.add_all(
            [
                Implement(
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
    equip_result = await session.execute(select(Equipment))
    equip_by_name = {item.name: item for item in equip_result.scalars().all()}
    impl_result = await session.execute(select(Implement))
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


async def main() -> None:
    async with AsyncSessionLocal() as session:
        org = await get_or_create_main_org(session)
        await seed_locations(session, org.id)
        await seed_work_types(session, org.id)
        await seed_equipment(session, org.id)
        await seed_employees(session, org.id)
        await seed_inventory_items(session)
        await seed_implements(session)

    print('Seed completed.')


if __name__ == '__main__':
    asyncio.run(main())
