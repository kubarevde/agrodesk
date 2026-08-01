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
from app.services.audit import log_change, model_snapshot
from app.services.auth import hash_password
from app.services.telegram_binding import TelegramBindError, assign_telegram_id

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


def _integrity_detail(touched_telegram: bool) -> str:
    if touched_telegram:
        return 'Этот Telegram ID уже привязан к другому сотруднику'
    return 'Сотрудник с таким кодом уже существует'


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
    current: Employee = Depends(require_manager),
) -> EmployeeResponse:
    """Bind, transfer (force_transfer), or unlink (telegram_id=null) Telegram ID."""
    org_id = get_org_id(request)
    employee = await get_employee_or_404(db, employee_id, org_id)
    before = model_snapshot(employee)

    try:
        await assign_telegram_id(
            db,
            employee,
            payload.telegram_id,
            force_transfer=payload.force_transfer,
        )
    except TelegramBindError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.detail,
        ) from None

    try:
        await log_change(
            db,
            org_id=org_id,
            entity_type='employee',
            entity_id=employee.id,
            action='update',
            changed_by=current.id,
            before=before,
            after=model_snapshot(employee),
        )
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
    current: Employee = Depends(require_admin),
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
        await db.flush()
        await log_change(
            db,
            org_id=employee.org_id,
            entity_type='employee',
            entity_id=employee.id,
            action='create',
            changed_by=current.id,
            after=model_snapshot(employee),
        )
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
    current: Employee = Depends(require_admin),
) -> EmployeeResponse:
    employee = await get_employee_or_404(db, employee_id, get_org_id(request))
    before = model_snapshot(employee)
    update_data = payload.model_dump(exclude_unset=True)

    password = update_data.pop('password', None)
    if password is not None:
        employee.password_hash = hash_password(password)

    telegram_id_set = 'telegram_id' in update_data
    telegram_id_value = update_data.pop('telegram_id', None) if telegram_id_set else None
    becoming_inactive = 'is_active' in update_data and update_data['is_active'] is False

    for field, value in update_data.items():
        setattr(employee, field, value)

    if becoming_inactive:
        employee.telegram_id = None
    elif telegram_id_set:
        try:
            await assign_telegram_id(
                db,
                employee,
                telegram_id_value,
                force_transfer=False,
            )
        except TelegramBindError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=exc.detail,
            ) from None

    db.add(employee)
    try:
        await log_change(
            db,
            org_id=employee.org_id,
            entity_type='employee',
            entity_id=employee.id,
            action='update',
            changed_by=current.id,
            before=before,
            after=model_snapshot(employee),
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_integrity_detail(telegram_id_set),
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
    before = model_snapshot(employee)
    employee.is_active = False
    employee.telegram_id = None
    db.add(employee)
    await log_change(
        db,
        org_id=employee.org_id,
        entity_type='employee',
        entity_id=employee.id,
        action='delete',
        changed_by=current.id,
        before=before,
        after=model_snapshot(employee),
    )
    await db.commit()
