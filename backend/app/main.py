from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select

from app.config import settings
from app.database import AsyncSessionLocal
from app.middleware.org_context import OrgContextMiddleware
from app.models.organization import SuperAdminUser
from app.routers import (
    agro_plan,
    auth,
    dashboard,
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
from app.services.telegram_notify import TelegramNotifier

app = FastAPI(title='АгроДеск API', version='5.0.0', docs_url='/docs')
app.state.notifier = TelegramNotifier(settings.telegram_bot_token)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.add_middleware(OrgContextMiddleware)


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


@app.on_event('startup')
async def bootstrap_on_startup() -> None:
    await _seed_superadmin()
    if settings.RUN_SEED_ON_START:
        await ensure_demo_data()


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok', 'version': '5.0.0'}


@app.get('/api/health')
async def api_health() -> dict[str, str]:
    return {'status': 'ok', 'version': '5.0.0'}


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
app.include_router(sharing.router, prefix='/api/sharing', tags=['sharing'])
app.include_router(notifications.router, prefix='/api/notifications', tags=['notifications'])
app.include_router(uploads.router, prefix='/api/uploads', tags=['uploads'])

uploads_dir = Path('./uploads')
uploads_dir.mkdir(exist_ok=True)
app.mount('/uploads', StaticFiles(directory='uploads'), name='uploads')
