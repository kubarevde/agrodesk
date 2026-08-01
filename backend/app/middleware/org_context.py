"""Attach current organization id to the request from the JWT.

Uses pure ASGI middleware (not BaseHTTPMiddleware) so request.state is reliable.
"""

from __future__ import annotations

from urllib.parse import unquote
from uuid import UUID

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.organization import Organization
from app.services.auth import ALGORITHM

_SKIP_EXACT = {'/', '/health', '/api/health'}
# Public anonymous APIs must be listed here — same pattern as /api/auth.
# Do NOT add org-scoped seller routes (/api/marketplace/*) to this list.
_SKIP_PREFIXES = ('/superadmin', '/api/auth', '/api/public')


def get_org_id(request: Request) -> UUID:
    """Return org_id set by middleware, or decode JWT as a safe fallback."""
    org_id = getattr(request.state, 'org_id', None)
    if isinstance(org_id, UUID):
        return org_id
    if org_id is not None:
        return UUID(str(org_id))

    auth_header = request.headers.get('Authorization') or ''
    if not auth_header.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
        )
    token = auth_header.removeprefix('Bearer ').strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        org_id_raw = payload.get('org_id')
        if org_id_raw is None:
            raise ValueError('org_id missing')
        return UUID(str(org_id_raw))
    except (JWTError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
        ) from exc


def _should_skip(path: str) -> bool:
    if path in _SKIP_EXACT:
        return True
    return any(path == prefix or path.startswith(f'{prefix}/') for prefix in _SKIP_PREFIXES)


class OrgContextMiddleware:
    """Pure ASGI middleware — avoids BaseHTTPMiddleware request.state bugs."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return

        path = scope.get('path') or ''
        if _should_skip(path) or not path.startswith('/api/'):
            await self.app(scope, receive, send)
            return

        headers = {
            k.decode('latin-1').lower(): v.decode('latin-1')
            for k, v in scope.get('headers') or []
        }
        auth_header = headers.get('authorization')
        token = ''
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.removeprefix('Bearer ').strip()
        elif path.startswith('/api/messenger/events'):
            # EventSource cannot set Authorization — allow JWT via ?token=
            query = scope.get('query_string', b'').decode('latin-1')
            for part in query.split('&'):
                if part.startswith('token='):
                    token = unquote(part[len('token=') :])
                    break

        if not token:
            response = JSONResponse(
                status_code=401,
                content={'detail': 'Недействительный токен'},
                headers={'WWW-Authenticate': 'Bearer'},
            )
            await response(scope, receive, send)
            return

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            org_id_raw = payload.get('org_id')
            if org_id_raw is None:
                raise ValueError('org_id missing')
            org_id = UUID(str(org_id_raw))
        except (JWTError, ValueError, TypeError):
            response = JSONResponse(
                status_code=401,
                content={'detail': 'Недействительный токен'},
                headers={'WWW-Authenticate': 'Bearer'},
            )
            await response(scope, receive, send)
            return

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Organization.id).where(
                    Organization.id == org_id,
                    Organization.is_active.is_(True),
                )
            )
            if result.scalar_one_or_none() is None:
                response = JSONResponse(
                    status_code=403,
                    content={'detail': 'Организация неактивна'},
                )
                await response(scope, receive, send)
                return

        scope.setdefault('state', {})
        scope['state']['org_id'] = org_id
        await self.app(scope, receive, send)
