import calendar
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from uuid import UUID

from fastapi.responses import StreamingResponse
from openpyxl.workbook.workbook import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.expense import Expense
from app.models.inventory import InventoryItem, InventoryOperation
from app.models.shift import Shift, ShiftStatus
from app.models.shipment import Shipment
from app.services.excel_styles import new_workbook, write_table
from app.services.shifts import calc_duration_from_datetimes, combine_date_time

EXPENSE_CATEGORY_LABELS = {
    'fuel': 'Топливо',
    'fertilizer': 'Удобрения',
    'parts': 'Запчасти',
    'salary': 'Зарплата',
    'rent': 'Аренда',
    'other': 'Прочее',
}

INVENTORY_CATEGORY_LABELS = {
    'fuel': 'Топливо',
    'fertilizer': 'Удобрения',
    'parts': 'Запчасти',
    'seeds': 'Семена',
    'chemicals': 'Химия',
    'other': 'Прочее',
}

OPERATION_TYPE_LABELS = {
    'income': 'Приход',
    'expense': 'Расход',
}

SHIFT_STATUS_LABELS = {
    'open': 'Открыта',
    'closed': 'Закрыта',
}


def parse_month(month: str) -> tuple[date, date]:
    year, mon = map(int, month.split('-'))
    last_day = calendar.monthrange(year, mon)[1]
    return date(year, mon, 1), date(year, mon, last_day)


def fmt_date(value: date) -> str:
    return value.strftime('%d.%m.%Y')


def fmt_time(value) -> str:
    if value is None:
        return ''
    return value.strftime('%H:%M')


def shift_hours(shift: Shift) -> float:
    if shift.duration_rounded is not None:
        return float(shift.duration_rounded)
    if shift.status == ShiftStatus.open:
        now = datetime.now()
        start_dt = combine_date_time(shift.date, shift.start_time)
        minutes = calc_duration_from_datetimes(start_dt, now)
        return round(minutes / 60, 2)
    return 0.0


def to_number(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def workbook_response(workbook: Workbook, filename: str) -> StreamingResponse:
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename={filename}'},
    )


async def fetch_shifts(
    db: AsyncSession,
    from_date: date,
    to_date: date,
    employee_id: UUID | None = None,
) -> list[Shift]:
    query = (
        select(Shift)
        .options(
            selectinload(Shift.employee),
            selectinload(Shift.location),
            selectinload(Shift.work_type),
            selectinload(Shift.equipment),
        )
        .where(Shift.date >= from_date, Shift.date <= to_date)
        .order_by(Shift.date, Shift.start_time)
    )
    if employee_id is not None:
        query = query.where(Shift.employee_id == employee_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def build_timesheet_workbook(
    db: AsyncSession,
    from_date: date,
    to_date: date,
    employee_id: UUID | None = None,
) -> Workbook:
    shifts = await fetch_shifts(db, from_date, to_date, employee_id)
    workbook = new_workbook()

    detail_rows = []
    summary_map: dict[UUID, dict[str, object]] = defaultdict(
        lambda: {'shifts': 0, 'hours': 0.0, 'rate': Decimal('0'), 'name': '', 'code': ''}
    )

    for shift in shifts:
        hours = shift_hours(shift)
        detail_rows.append(
            [
                fmt_date(shift.date),
                shift.employee.full_name,
                shift.employee.employee_code,
                shift.location.name,
                shift.work_type.name,
                shift.equipment.name if shift.equipment else '',
                fmt_time(shift.start_time),
                fmt_time(shift.end_time),
                hours,
                SHIFT_STATUS_LABELS.get(shift.status.value, shift.status.value),
            ]
        )
        employee_summary = summary_map[shift.employee_id]
        employee_summary['name'] = shift.employee.full_name
        employee_summary['code'] = shift.employee.employee_code
        employee_summary['rate'] = shift.employee.hourly_rate
        employee_summary['shifts'] = int(employee_summary['shifts']) + 1
        employee_summary['hours'] = float(employee_summary['hours']) + hours

    ws_detail = workbook.active
    ws_detail.title = 'Табель'
    write_table(
        ws_detail,
        ['Дата', 'ФИО', 'Код', 'Объект', 'Тип работ', 'Техника', 'Начало', 'Конец', 'Часов', 'Статус'],
        detail_rows,
    )

    summary_rows = []
    total_hours = 0.0
    total_pay = 0.0
    for item in sorted(summary_map.values(), key=lambda row: str(row['name'])):
        hours = float(item['hours'])
        rate = to_number(item['rate'])
        pay = round(hours * rate, 2)
        total_hours += hours
        total_pay += pay
        summary_rows.append([item['name'], item['code'], item['shifts'], hours, rate, pay])

    ws_summary = workbook.create_sheet('Сводка')
    write_table(
        ws_summary,
        ['ФИО', 'Код', 'Смен', 'Часов', 'Ставка', 'К выплате'],
        summary_rows,
        ['ИТОГО', '', sum(int(item['shifts']) for item in summary_map.values()), total_hours, '', total_pay],
    )
    return workbook


async def build_salary_workbook(db: AsyncSession, month: str) -> Workbook:
    from_date, to_date = parse_month(month)
    shifts = await fetch_shifts(db, from_date, to_date)
    employees_result = await db.execute(
        select(Employee).where(Employee.is_active.is_(True)).order_by(Employee.full_name)
    )
    employees = employees_result.scalars().all()

    stats: dict[UUID, dict[str, object]] = {
        employee.id: {'shifts': 0, 'hours': 0.0} for employee in employees
    }
    for shift in shifts:
        if shift.employee_id not in stats:
            continue
        stats[shift.employee_id]['shifts'] = int(stats[shift.employee_id]['shifts']) + 1
        stats[shift.employee_id]['hours'] = float(stats[shift.employee_id]['hours']) + shift_hours(shift)

    workbook = new_workbook()
    ws = workbook.active
    ws.title = 'Зарплатная ведомость'

    rows = []
    total_hours = 0.0
    total_pay = 0.0
    for employee in employees:
        employee_stats = stats[employee.id]
        hours = float(employee_stats['hours'])
        rate = to_number(employee.hourly_rate)
        pay = round(hours * rate, 2)
        total_hours += hours
        total_pay += pay
        rows.append(
            [
                employee.full_name,
                employee.position or '',
                employee_stats['shifts'],
                hours,
                rate,
                pay,
                '',
            ]
        )

    write_table(
        ws,
        ['ФИО', 'Должность', 'Смен', 'Часов', 'Ставка', 'К выплате', 'Подпись'],
        rows,
        ['ИТОГО', '', sum(int(stats[e.id]['shifts']) for e in employees), total_hours, '', total_pay, ''],
    )
    return workbook


async def build_inventory_workbook(db: AsyncSession, from_date: date, to_date: date) -> Workbook:
    operations_result = await db.execute(
        select(InventoryOperation)
        .options(selectinload(InventoryOperation.item))
        .where(InventoryOperation.date >= from_date, InventoryOperation.date <= to_date)
        .order_by(InventoryOperation.date.desc(), InventoryOperation.created_at.desc())
    )
    operations = operations_result.scalars().all()

    items_result = await db.execute(
        select(InventoryItem)
        .where(InventoryItem.is_active.is_(True))
        .order_by(InventoryItem.name)
    )
    items = items_result.scalars().all()

    workbook = new_workbook()
    ws_ops = workbook.active
    ws_ops.title = 'Операции'
    operation_rows = [
        [
            fmt_date(operation.date),
            operation.item.name,
            OPERATION_TYPE_LABELS.get(operation.type.value, operation.type.value),
            to_number(operation.quantity),
            to_number(operation.stock_after),
            operation.reason or '',
            operation.supplier or '',
            to_number(operation.cost) if operation.cost is not None else '',
        ]
        for operation in operations
    ]
    write_table(
        ws_ops,
        ['Дата', 'Наименование', 'Тип', 'Количество', 'Остаток после', 'Причина', 'Поставщик', 'Стоимость'],
        operation_rows,
    )

    ws_stock = workbook.create_sheet('Остатки')
    stock_rows = [
        [
            item.name,
            INVENTORY_CATEGORY_LABELS.get(item.category.value, item.category.value),
            item.unit,
            to_number(item.current_stock),
            to_number(item.min_stock),
            'Да' if item.current_stock < item.min_stock else 'Нет',
        ]
        for item in items
    ]
    write_table(
        ws_stock,
        ['Наименование', 'Категория', 'Ед.', 'Остаток', 'Мин.', 'Критично'],
        stock_rows,
    )
    return workbook


async def build_shipments_workbook(db: AsyncSession, from_date: date, to_date: date) -> Workbook:
    result = await db.execute(
        select(Shipment)
        .where(Shipment.date >= from_date, Shipment.date <= to_date)
        .order_by(Shipment.date)
    )
    shipments = result.scalars().all()

    workbook = new_workbook()
    ws = workbook.active
    ws.title = 'Отгрузки'

    rows = []
    total_kg = 0.0
    total_sum = 0.0
    for shipment in shipments:
        kg = to_number(shipment.quantity_kg)
        price = to_number(shipment.price_per_kg) if shipment.price_per_kg is not None else None
        amount = round(kg * price, 2) if price is not None else 0.0
        total_kg += kg
        total_sum += amount
        rows.append(
            [
                fmt_date(shipment.date),
                shipment.crop_type,
                kg,
                shipment.destination or '',
                price if price is not None else '',
                amount if price is not None else '',
            ]
        )

    write_table(
        ws,
        ['Дата', 'Культура', 'Кг', 'Направление', 'Цена/кг', 'Сумма'],
        rows,
        ['ИТОГО', '', total_kg, '', '', total_sum],
    )
    return workbook


async def build_expenses_workbook(db: AsyncSession, from_date: date, to_date: date) -> Workbook:
    result = await db.execute(
        select(Expense)
        .where(Expense.date >= from_date, Expense.date <= to_date)
        .order_by(Expense.date)
    )
    expenses = result.scalars().all()

    workbook = new_workbook()
    ws = workbook.active
    ws.title = 'Затраты'

    rows = []
    total_amount = 0.0
    for expense in expenses:
        amount = to_number(expense.amount)
        total_amount += amount
        rows.append(
            [
                fmt_date(expense.date),
                EXPENSE_CATEGORY_LABELS.get(expense.category, expense.category),
                amount,
                expense.description or '',
                expense.supplier or '',
            ]
        )

    write_table(
        ws,
        ['Дата', 'Категория', 'Сумма', 'Описание', 'Поставщик'],
        rows,
        ['ИТОГО', '', total_amount, '', ''],
    )
    return workbook


async def build_summary_workbook(db: AsyncSession, month: str) -> Workbook:
    from_date, to_date = parse_month(month)
    shifts = await fetch_shifts(db, from_date, to_date)

    shipments_result = await db.execute(
        select(Shipment).where(Shipment.date >= from_date, Shipment.date <= to_date)
    )
    shipments = shipments_result.scalars().all()

    expenses_result = await db.execute(
        select(Expense).where(Expense.date >= from_date, Expense.date <= to_date)
    )
    expenses = expenses_result.scalars().all()

    operations_result = await db.execute(
        select(InventoryOperation).where(
            InventoryOperation.date >= from_date,
            InventoryOperation.date <= to_date,
        )
    )
    operations = operations_result.scalars().all()

    items_result = await db.execute(
        select(InventoryItem).where(InventoryItem.is_active.is_(True))
    )
    items = items_result.scalars().all()

    workbook = new_workbook()

    total_hours = sum(shift_hours(shift) for shift in shifts)
    employee_hours: dict[str, float] = defaultdict(float)
    for shift in shifts:
        employee_hours[shift.employee.full_name] += shift_hours(shift)

    ws_time = workbook.active
    ws_time.title = 'Рабочее время'
    time_rows = [
        ['Период', f'{fmt_date(from_date)} - {fmt_date(to_date)}'],
        ['Всего смен', len(shifts)],
        ['Всего часов', round(total_hours, 2)],
        ['Сотрудников', len(employee_hours)],
    ]
    write_table(ws_time, ['Показатель', 'Значение'], time_rows)
    employee_rows = [
        [name, round(hours, 2)] for name, hours in sorted(employee_hours.items())
    ]
    start_row = ws_time.max_row + 2
    ws_time.cell(row=start_row, column=1, value='ФИО')
    ws_time.cell(row=start_row, column=2, value='Часов')
    for offset, row in enumerate(employee_rows, start=1):
        ws_time.cell(row=start_row + offset, column=1, value=row[0])
        ws_time.cell(row=start_row + offset, column=2, value=row[1])

    shipments_kg = sum(to_number(item.quantity_kg) for item in shipments)
    shipments_sum = sum(
        to_number(item.quantity_kg) * to_number(item.price_per_kg)
        for item in shipments
        if item.price_per_kg is not None
    )
    expenses_sum = sum(to_number(item.amount) for item in expenses)
    expenses_by_category: dict[str, float] = defaultdict(float)
    for expense in expenses:
        label = EXPENSE_CATEGORY_LABELS.get(expense.category, expense.category)
        expenses_by_category[label] += to_number(expense.amount)

    ws_finance = workbook.create_sheet('Финансы')
    finance_rows = [
        ['Отгрузки (кг)', shipments_kg],
        ['Отгрузки (сумма)', round(shipments_sum, 2)],
        ['Затраты (всего)', round(expenses_sum, 2)],
        ['Баланс', round(shipments_sum - expenses_sum, 2)],
    ]
    write_table(ws_finance, ['Показатель', 'Сумма'], finance_rows)
    category_start = ws_finance.max_row + 2
    ws_finance.cell(row=category_start, column=1, value='Категория')
    ws_finance.cell(row=category_start, column=2, value='Сумма')
    for offset, (category, amount) in enumerate(sorted(expenses_by_category.items()), start=1):
        ws_finance.cell(row=category_start + offset, column=1, value=category)
        ws_finance.cell(row=category_start + offset, column=2, value=round(amount, 2))

    income_count = sum(1 for op in operations if op.type.value == 'income')
    expense_count = sum(1 for op in operations if op.type.value == 'expense')
    critical_count = sum(1 for item in items if item.current_stock < item.min_stock)

    ws_stock = workbook.create_sheet('Склад')
    stock_rows = [
        ['Операций приход', income_count],
        ['Операций расход', expense_count],
        ['Критичных позиций', critical_count],
        ['Всего позиций', len(items)],
    ]
    write_table(ws_stock, ['Показатель', 'Значение'], stock_rows)
    critical_rows = [
        [item.name, to_number(item.current_stock), to_number(item.min_stock), item.unit]
        for item in items
        if item.current_stock < item.min_stock
    ]
    critical_start = ws_stock.max_row + 2
    ws_stock.cell(row=critical_start, column=1, value='Наименование')
    ws_stock.cell(row=critical_start, column=2, value='Остаток')
    ws_stock.cell(row=critical_start, column=3, value='Мин.')
    ws_stock.cell(row=critical_start, column=4, value='Ед.')
    for offset, row in enumerate(critical_rows, start=1):
        for col, value in enumerate(row, start=1):
            ws_stock.cell(row=critical_start + offset, column=col, value=value)

    return workbook
