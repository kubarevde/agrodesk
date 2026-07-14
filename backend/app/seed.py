import asyncio
from decimal import Decimal

import bcrypt
from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.inventory import InventoryCategory, InventoryItem
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
    ('МТЗ-82', 'трактор'),
    ('К-700', 'трактор'),
    ('Дон-1500Б', 'комбайн'),
    ('Газель', 'грузовик'),
    ('КамАЗ', 'грузовик'),
    ('Опрыскиватель Jacto', 'опрыскиватель'),
    ('Культиватор КПС-4', 'культиватор'),
    ('Сеялка СЗ-3.6', 'сеялка'),
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


async def is_table_empty(session, model) -> bool:
    result = await session.scalar(select(func.count()).select_from(model))
    return (result or 0) == 0


async def seed_locations(session) -> None:
    if not await is_table_empty(session, Location):
        print('locations: skip (already seeded)')
        return

    session.add_all(
        [Location(name=name, description=description, is_active=True) for name, description in LOCATIONS]
    )
    await session.commit()
    print(f'locations: seeded {len(LOCATIONS)} rows')


async def seed_work_types(session) -> None:
    if not await is_table_empty(session, WorkType):
        print('work_types: skip (already seeded)')
        return

    session.add_all(
        [WorkType(name=name, category=category, is_active=True) for name, category in WORK_TYPES]
    )
    await session.commit()
    print(f'work_types: seeded {len(WORK_TYPES)} rows')


async def seed_equipment(session) -> None:
    if not await is_table_empty(session, Equipment):
        print('equipment: skip (already seeded)')
        return

    session.add_all(
        [Equipment(name=name, type=equipment_type, is_active=True) for name, equipment_type in EQUIPMENT]
    )
    await session.commit()
    print(f'equipment: seeded {len(EQUIPMENT)} rows')


async def seed_employees(session) -> None:
    if not await is_table_empty(session, Employee):
        print('employees: skip (already seeded)')
        return

    session.add_all(
        [
            Employee(
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


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed_locations(session)
        await seed_work_types(session)
        await seed_equipment(session)
        await seed_employees(session)
        await seed_inventory_items(session)

    print('Seed completed.')


if __name__ == '__main__':
    asyncio.run(main())
