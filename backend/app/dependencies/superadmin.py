from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.organization import SuperAdminUser
from app.services.auth import ALGORITHM

security = HTTPBearer(auto_error=False)


async def require_superadmin(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> SuperAdminUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Недействительный токен',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    forbidden = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail='Недостаточно прав',
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get('role') != 'superadmin':
            raise forbidden
        sub = payload.get('sub')
        if sub is None:
            raise credentials_exception
        admin_id = UUID(str(sub))
    except (JWTError, ValueError):
        raise credentials_exception from None

    result = await db.execute(
        select(SuperAdminUser).where(
            SuperAdminUser.id == admin_id,
            SuperAdminUser.is_active.is_(True),
        )
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        raise credentials_exception
    return admin
