from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.services.auth import ALGORITHM

security = HTTPBearer(auto_error=False)


async def get_current_employee(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Employee:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Недействительный токен',
        headers={'WWW-Authenticate': 'Bearer'},
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
        employee_id = payload.get('sub')
        if employee_id is None:
            raise credentials_exception
        employee_uuid = UUID(str(employee_id))
    except (JWTError, ValueError):
        raise credentials_exception from None

    result = await db.execute(select(Employee).where(Employee.id == employee_uuid))
    employee = result.scalar_one_or_none()

    if employee is None or not employee.is_active:
        raise credentials_exception

    return employee


async def require_manager(
    employee: Employee = Depends(get_current_employee),
) -> Employee:
    if employee.role not in (EmployeeRole.manager, EmployeeRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Недостаточно прав',
        )
    return employee


async def require_admin(
    employee: Employee = Depends(get_current_employee),
) -> Employee:
    if employee.role != EmployeeRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Недостаточно прав',
        )
    return employee
