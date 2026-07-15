from uuid import UUID

from fastapi import Request
from jose import JWTError, jwt
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.organization import Organization
from app.services.auth import ALGORITHM

_SKIP_EXACT = {'/', '/health'}
_SKIP_PREFIXES = ('/superadmin', '/api/auth')


def get_org_id(request: Request) -> UUID:
    return request.state.org_id


def _should_skip(path: str) -> bool:
    if path in _SKIP_EXACT:
        return True
    return any(path == prefix or path.startswith(f'{prefix}/') for prefix in _SKIP_PREFIXES)


class OrgContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        if _should_skip(path) or not path.startswith('/api/'):
            return await call_next(request)

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(
                status_code=401,
                content={'detail': 'Недействительный токен'},
                headers={'WWW-Authenticate': 'Bearer'},
            )

        token = auth_header.removeprefix('Bearer ').strip()
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            org_id_raw = payload.get('org_id')
            if org_id_raw is None:
                return JSONResponse(
                    status_code=401,
                    content={'detail': 'Недействительный токен'},
                    headers={'WWW-Authenticate': 'Bearer'},
                )
            org_id = UUID(str(org_id_raw))
        except (JWTError, ValueError, TypeError):
            return JSONResponse(
                status_code=401,
                content={'detail': 'Недействительный токен'},
                headers={'WWW-Authenticate': 'Bearer'},
            )

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Organization.id).where(
                    Organization.id == org_id,
                    Organization.is_active.is_(True),
                )
            )
            if result.scalar_one_or_none() is None:
                return JSONResponse(
                    status_code=403,
                    content={'detail': 'Организация неактивна'},
                )

        request.state.org_id = org_id
        return await call_next(request)
