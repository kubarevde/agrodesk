from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.models.employee import Employee
from app.models.expense import Expense
from app.schemas.expense import ExpenseCategory, ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.services.dashboard import clear_dashboard_cache

router = APIRouter()


def expense_to_response(expense: Expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=expense.id,
        date=expense.date,
        category=expense.category,
        amount=expense.amount,
        description=expense.description or '',
        supplier=expense.supplier,
        payment_method=expense.payment_method,
    )


async def get_expense_or_404(db: AsyncSession, expense_id: UUID) -> Expense:
    expense = await db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Затрата не найдена')
    return expense


@router.get('', response_model=list[ExpenseResponse])
async def list_expenses(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    category: ExpenseCategory | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[ExpenseResponse]:
    query = select(Expense)

    if from_date is not None:
        query = query.where(Expense.date >= from_date)
    if to_date is not None:
        query = query.where(Expense.date <= to_date)
    if category is not None:
        query = query.where(Expense.category == category.value)

    query = query.order_by(Expense.date.desc(), Expense.created_at.desc())
    result = await db.execute(query)
    return [expense_to_response(expense) for expense in result.scalars().all()]


@router.get('/{expense_id}', response_model=ExpenseResponse)
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> ExpenseResponse:
    expense = await get_expense_or_404(db, expense_id)
    return expense_to_response(expense)


@router.post('', response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ExpenseResponse:
    expense = Expense(
        date=payload.date,
        category=payload.category.value,
        amount=payload.amount,
        description=payload.description,
        supplier=payload.supplier,
        payment_method=payload.payment_method.value if payload.payment_method else None,
        created_by=current.id,
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    clear_dashboard_cache()
    return expense_to_response(expense)


@router.patch('/{expense_id}', response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    payload: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ExpenseResponse:
    expense = await get_expense_or_404(db, expense_id)
    update_data = payload.model_dump(exclude_unset=True)

    if 'category' in update_data and update_data['category'] is not None:
        update_data['category'] = update_data['category'].value
    if 'payment_method' in update_data and update_data['payment_method'] is not None:
        update_data['payment_method'] = update_data['payment_method'].value

    for field, value in update_data.items():
        setattr(expense, field, value)

    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    clear_dashboard_cache()
    return expense_to_response(expense)


@router.delete('/{expense_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> None:
    expense = await get_expense_or_404(db, expense_id)
    await db.delete(expense)
    await db.commit()
    clear_dashboard_cache()
