from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee, EmployeeRole
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate, LinkTelegramRequest
from app.services.auth import hash_password

router = APIRouter()


def employee_to_response(employee: Employee) -> EmployeeResponse:
    return EmployeeResponse(
        id=employee.id,
        org_id=employee.org_id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        position=employee.position,
        hourly_rate=employee.hourly_rate,
        role=employee.role.value,
        is_active=employee.is_active,
        telegram_id=employee.telegram_id,
    )


async def get_employee_or_404(db: AsyncSession, employee_id: UUID, org_id: UUID) -> Employee:
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Сотрудник не найден')
    return employee


@router.get('', response_model=list[EmployeeResponse])
async def list_employees(
    request: Request,
    role: EmployeeRole | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[EmployeeResponse]:
    org_id = get_org_id(request)
    query = select(Employee).where(Employee.org_id == org_id)
    if role is not None:
        query = query.where(Employee.role == role)
    if is_active is not None:
        query = query.where(Employee.is_active == is_active)
    query = query.order_by(Employee.employee_code)
    result = await db.execute(query)
    return [employee_to_response(employee) for employee in result.scalars().all()]


@router.get('/me', response_model=EmployeeResponse)
async def get_me(employee: Employee = Depends(get_current_employee)) -> EmployeeResponse:
    return employee_to_response(employee)


@router.get('/me/earnings')
async def get_my_earnings(
    request: Request,
    month: str = Query(..., pattern=r'^\d{4}-\d{2}$'),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
):
    from app.services.reports import build_employee_earnings

    return await build_employee_earnings(db, current.id, month, get_org_id(request))


@router.get('/{employee_id}', response_model=EmployeeResponse)
async def get_employee(
    request: Request,
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> EmployeeResponse:
    employee = await get_employee_or_404(db, employee_id, get_org_id(request))
    return employee_to_response(employee)


@router.patch('/{employee_id}/link-telegram', response_model=EmployeeResponse)
async def link_telegram(
    request: Request,
    employee_id: UUID,
    payload: LinkTelegramRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> EmployeeResponse:
    org_id = get_org_id(request)
    employee = await get_employee_or_404(db, employee_id, org_id)

    existing = await db.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.telegram_id == payload.telegram_id,
            Employee.id != employee_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Этот Telegram ID уже привязан к другому сотруднику',
        )

    employee.telegram_id = payload.telegram_id
    db.add(employee)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Этот Telegram ID уже привязан к другому сотруднику',
        ) from None
    await db.refresh(employee)
    return employee_to_response(employee)


@router.post('', response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    request: Request,
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> EmployeeResponse:
    employee = Employee(
        org_id=get_org_id(request),
        employee_code=payload.employee_code,
        full_name=payload.full_name,
        position=payload.position,
        hourly_rate=payload.hourly_rate,
        role=payload.role,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(employee)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сотрудник с таким кодом уже существует',
        ) from None
    await db.refresh(employee)
    return employee_to_response(employee)


@router.patch('/{employee_id}', response_model=EmployeeResponse)
async def update_employee(
    request: Request,
    employee_id: UUID,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> EmployeeResponse:
    employee = await get_employee_or_404(db, employee_id, get_org_id(request))
    update_data = payload.model_dump(exclude_unset=True)

    password = update_data.pop('password', None)
    if password is not None:
        employee.password_hash = hash_password(password)

    for field, value in update_data.items():
        setattr(employee, field, value)

    db.add(employee)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сотрудник с таким кодом уже существует',
        ) from None
    await db.refresh(employee)
    return employee_to_response(employee)


@router.delete('/{employee_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    request: Request,
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> None:
    if employee_id == current.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Нельзя удалить себя',
        )

    employee = await get_employee_or_404(db, employee_id, get_org_id(request))
    employee.is_active = False
    db.add(employee)
    await db.commit()
