from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_manager
from app.models.employee import Employee
from app.schemas.reports import (
    DateRangeRequest,
    EquipmentReportRequest,
    FieldsReportRequest,
    MonthReportRequest,
    SeasonReportRequest,
    TimesheetReportRequest,
)
from app.services.reports import (
    build_equipment_workbook,
    build_expenses_workbook,
    build_fields_workbook,
    build_inventory_workbook,
    build_salary_workbook,
    build_season_workbook,
    build_shipments_workbook,
    build_summary_workbook,
    build_timesheet_workbook,
    workbook_response,
)

router = APIRouter()


@router.post('/timesheet')
async def report_timesheet(
    payload: TimesheetReportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_timesheet_workbook(
        db,
        payload.from_date,
        payload.to_date,
        payload.employee_id,
    )
    return workbook_response(workbook, 'timesheet.xlsx')


@router.post('/salary')
async def report_salary(
    payload: MonthReportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_salary_workbook(db, payload.month)
    return workbook_response(workbook, f'salary_{payload.month}.xlsx')


@router.post('/inventory')
async def report_inventory(
    payload: DateRangeRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_inventory_workbook(db, payload.from_date, payload.to_date)
    return workbook_response(workbook, 'inventory.xlsx')


@router.post('/shipments')
async def report_shipments(
    payload: DateRangeRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_shipments_workbook(db, payload.from_date, payload.to_date)
    return workbook_response(workbook, 'shipments.xlsx')


@router.post('/expenses')
async def report_expenses(
    payload: DateRangeRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_expenses_workbook(db, payload.from_date, payload.to_date)
    return workbook_response(workbook, 'expenses.xlsx')


@router.post('/summary')
async def report_summary(
    payload: MonthReportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_summary_workbook(db, payload.month)
    return workbook_response(workbook, f'summary_{payload.month}.xlsx')


@router.post('/equipment')
async def report_equipment(
    payload: EquipmentReportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_equipment_workbook(
        db,
        payload.from_date,
        payload.to_date,
        payload.equipment_id,
    )
    return workbook_response(
        workbook,
        f'equipment_{payload.from_date}_{payload.to_date}.xlsx',
    )


@router.post('/fields')
async def report_fields(
    payload: FieldsReportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_fields_workbook(
        db,
        payload.from_date,
        payload.to_date,
        payload.field_id,
    )
    return workbook_response(
        workbook,
        f'fields_{payload.from_date}_{payload.to_date}.xlsx',
    )


@router.post('/season')
async def report_season(
    payload: SeasonReportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
):
    workbook = await build_season_workbook(db, payload.year)
    return workbook_response(workbook, f'season_{payload.year}.xlsx')
