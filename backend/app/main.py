import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.core.logging import setup_logging
from app.database import AsyncSessionLocal, engine
from app.middleware.org_context import OrgContextMiddleware
from app.models.organization import SuperAdminUser
from app.routers import (
    agro_plan,
    auth,
    dashboard,
    dictionaries,
    employee_rates,
    employees,
    equipment_logs,
    expenses,
    fields,
    implements,
    inventory,
    maintenance,
    notifications,
    references,
    reports,
    settings as settings_router,
    sharing,
    shipments,
    shifts,
    superadmin,
    uploads,
)
from app.seed import ensure_demo_data
from app.services.auth import hash_password
from app.services.db_preflight import check_db_revision
from app.services.telegram_notify import TelegramNotifier

setup_logging()
logger = logging.getLogger(__name__)
_db_preflight: dict[str, object] = {
    'db_revision': None,
    'code_head': None,
    'db_up_to_date': False,
}


async def _seed_superadmin() -> None:
    if not settings.superadmin_email or not settings.superadmin_password:
        return

    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(func.count()).select_from(SuperAdminUser))
        if int(existing or 0) > 0:
            return

        db.add(
            SuperAdminUser(
                email=settings.superadmin_email.lower(),
                hashed_password=hash_password(settings.superadmin_password),
                is_active=True,
            )
        )
        await db.commit()


async def _bootstrap() -> None:
    """Best-effort bootstrap. Missing migrations must not kill the API process."""
    try:
        await _seed_superadmin()
    except SQLAlchemyError as exc:
        logger.warning(
            'Superadmin seed skipped (run: alembic upgrade head). Detail: %s',
            exc,
        )

    if settings.RUN_SEED_ON_START:
        try:
            await ensure_demo_data()
        except SQLAlchemyError as exc:
            logger.warning(
                'Demo seed skipped (run: alembic upgrade head && python -m app.seed). Detail: %s',
                exc,
            )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _db_preflight
    logger.info('API starting (graceful shutdown enabled)')
    _db_preflight = await check_db_revision(engine)
    if not _db_preflight.get('db_up_to_date'):
        logger.error(
            'CRITICAL: schema mismatch — Settings/dictionaries may 404 until '
            '`alembic upgrade head` and a full API restart'
        )
    await _bootstrap()
    yield
    logger.info('API shutting down — disposing DB engine')
    await engine.dispose()
    logger.info('Graceful shutdown complete')


app = FastAPI(
    title='АгроДеск API',
    version='5.0.0',
    docs_url='/docs',
    lifespan=lifespan,
)
app.state.notifier = TelegramNotifier(settings.telegram_bot_token)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.add_middleware(OrgContextMiddleware)


def _health_payload() -> dict[str, object]:
    return {
        'status': 'ok' if _db_preflight.get('db_up_to_date') else 'degraded',
        'version': '5.0.0',
        'db_revision': _db_preflight.get('db_revision'),
        'code_head': _db_preflight.get('code_head'),
        'db_up_to_date': bool(_db_preflight.get('db_up_to_date')),
    }


@app.get('/health')
async def health() -> dict[str, object]:
    return _health_payload()


@app.get('/api/health')
async def api_health() -> dict[str, object]:
    return _health_payload()


app.include_router(superadmin.router, prefix='/superadmin/api', tags=['superadmin'])
app.include_router(auth.router, prefix='/api/auth', tags=['auth'])
app.include_router(agro_plan.router, prefix='/api/agro-plan', tags=['agro-plan'])
app.include_router(employees.router, prefix='/api/employees', tags=['employees'])
app.include_router(employee_rates.router, prefix='/api/employee-rates', tags=['employee-rates'])
app.include_router(shifts.router, prefix='/api/shifts', tags=['shifts'])
app.include_router(references.locations_router, prefix='/api/locations', tags=['locations'])
app.include_router(fields.router, prefix='/api/fields', tags=['fields'])
app.include_router(implements.router, prefix='/api/implements', tags=['implements'])
app.include_router(references.work_types_router, prefix='/api/work-types', tags=['work-types'])
# maintenance before equipment so /maintenance/upcoming is not captured by /{item_id}
app.include_router(maintenance.router, prefix='/api/equipment', tags=['maintenance'])
app.include_router(references.equipment_router, prefix='/api/equipment', tags=['equipment'])
app.include_router(equipment_logs.router, prefix='/api/equipment', tags=['equipment-logs'])
app.include_router(inventory.router, prefix='/api/inventory', tags=['inventory'])
app.include_router(shipments.router, prefix='/api/shipments', tags=['shipments'])
app.include_router(expenses.router, prefix='/api/expenses', tags=['expenses'])
app.include_router(dashboard.router, prefix='/api/dashboard', tags=['dashboard'])
app.include_router(reports.router, prefix='/api/reports', tags=['reports'])
app.include_router(settings_router.router, prefix='/api/settings', tags=['settings'])
app.include_router(dictionaries.router, prefix='/api/dictionaries', tags=['dictionaries'])
app.include_router(sharing.router, prefix='/api/sharing', tags=['sharing'])
app.include_router(notifications.router, prefix='/api/notifications', tags=['notifications'])
app.include_router(uploads.router, prefix='/api/uploads', tags=['uploads'])

uploads_dir = Path(settings.UPLOADS_DIR)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=str(uploads_dir)), name='uploads')
