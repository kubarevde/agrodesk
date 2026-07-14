from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.models.employee import Employee
from app.schemas.auth import ChangePasswordRequest, EmployeeMe, LoginRequest, TokenResponse
from app.services.auth import create_access_token, hash_password, verify_password

router = APIRouter()


def employee_to_me(employee: Employee) -> EmployeeMe:
    return EmployeeMe(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        position=employee.position,
        role=employee.role.value,
        hourly_rate=float(employee.hourly_rate or 0),
    )


@router.post('/login', response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(
        select(Employee).where(Employee.employee_code == payload.employee_code)
    )
    employee = result.scalar_one_or_none()

    if employee is None or not verify_password(payload.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный код или пароль',
        )

    if not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный код или пароль',
        )

    access_token = create_access_token({'sub': str(employee.id)})
    return TokenResponse(access_token=access_token, employee=employee_to_me(employee))


@router.get('/me', response_model=EmployeeMe)
async def me(employee: Employee = Depends(get_current_employee)) -> EmployeeMe:
    return employee_to_me(employee)


@router.post('/change-password', status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Неверный текущий пароль',
        )

    employee.password_hash = hash_password(payload.new_password)
    db.add(employee)
    await db.commit()
