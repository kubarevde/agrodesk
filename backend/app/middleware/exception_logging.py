"""Register FastAPI exception handlers (safer than BaseHTTPMiddleware)."""

from __future__ import annotations

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Log unexpected errors. HTTPException / validation keep default handlers."""

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            'Unhandled error %s %s: %s\n%s',
            request.method,
            request.url.path,
            exc,
            traceback.format_exc(),
        )
        return JSONResponse(
            status_code=500,
            content={'detail': 'Внутренняя ошибка сервера'},
        )
