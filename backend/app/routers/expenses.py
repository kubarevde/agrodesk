from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.services.dashboard import clear_dashboard_cache

router = APIRouter()


def expense_to_response(expense: Expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=expense.id,
        org_id=expense.org_id,
        date=expense.date,
        category=expense.category,
        amount=expense.amount,
        description=expense.description or '',
        supplier=expense.supplier,
        payment_method=expense.payment_method,
        equipment_id=expense.equipment_id,
        equipment_name=expense.equipment.name if expense.equipment else None,
    )


def expense_load_options():
    return (selectinload(Expense.equipment),)


async def get_expense_or_404(db: AsyncSession, expense_id: UUID, org_id: UUID) -> Expense:
    result = await db.execute(
        select(Expense)
        .options(*expense_load_options())
        .where(Expense.id == expense_id, Expense.org_id == org_id)
    )
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Затрата не найдена')
    return expense


@router.get('', response_model=list[ExpenseResponse])
async def list_expenses(
    request: Request,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    category: str | None = Query(None),
    equipment_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[ExpenseResponse]:
    org_id = get_org_id(request)
    query = select(Expense).options(*expense_load_options()).where(Expense.org_id == org_id)

    if from_date is not None:
        query = query.where(Expense.date >= from_date)
    if to_date is not None:
        query = query.where(Expense.date <= to_date)
    if category is not None:
        query = query.where(Expense.category == category)
    if equipment_id is not None:
        query = query.where(Expense.equipment_id == equipment_id)

    query = query.order_by(Expense.date.desc(), Expense.created_at.desc())
    result = await db.execute(query)
    return [expense_to_response(expense) for expense in result.scalars().all()]


@router.get('/{expense_id}', response_model=ExpenseResponse)
async def get_expense(
    request: Request,
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> ExpenseResponse:
    expense = await get_expense_or_404(db, expense_id, get_org_id(request))
    return expense_to_response(expense)


@router.post('', response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    request: Request,
    payload: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ExpenseResponse:
    org_id = get_org_id(request)
    expense = Expense(
        org_id=org_id,
        date=payload.date,
        category=payload.category.strip(),
        amount=payload.amount,
        description=payload.description,
        supplier=payload.supplier,
        payment_method=payload.payment_method.value if payload.payment_method else None,
        equipment_id=payload.equipment_id,
        created_by=current.id,
    )
    db.add(expense)
    await db.commit()
    clear_dashboard_cache()
    return expense_to_response(await get_expense_or_404(db, expense.id, org_id))


@router.patch('/{expense_id}', response_model=ExpenseResponse)
async def update_expense(
    request: Request,
    expense_id: UUID,
    payload: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ExpenseResponse:
    org_id = get_org_id(request)
    expense = await get_expense_or_404(db, expense_id, org_id)
    update_data = payload.model_dump(exclude_unset=True)

    if 'category' in update_data and update_data['category'] is not None:
        update_data['category'] = str(update_data['category']).strip()
    if 'payment_method' in update_data and update_data['payment_method'] is not None:
        update_data['payment_method'] = update_data['payment_method'].value

    for field, value in update_data.items():
        setattr(expense, field, value)

    db.add(expense)
    await db.commit()
    clear_dashboard_cache()
    return expense_to_response(await get_expense_or_404(db, expense.id, org_id))


@router.delete('/{expense_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    request: Request,
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> None:
    expense = await get_expense_or_404(db, expense_id, get_org_id(request))
    await db.delete(expense)
    await db.commit()
    clear_dashboard_cache()
