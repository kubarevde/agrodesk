from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    auth,
    dashboard,
    employees,
    expenses,
    inventory,
    references,
    reports,
    settings as settings_router,
    shipments,
    shifts,
)

app = FastAPI(title='АгроДеск API', version='2.0.0', docs_url='/docs')

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok', 'version': '2.0.0'}


app.include_router(auth.router, prefix='/api/auth', tags=['auth'])
app.include_router(employees.router, prefix='/api/employees', tags=['employees'])
app.include_router(shifts.router, prefix='/api/shifts', tags=['shifts'])
app.include_router(references.locations_router, prefix='/api/locations', tags=['locations'])
app.include_router(references.work_types_router, prefix='/api/work-types', tags=['work-types'])
app.include_router(references.equipment_router, prefix='/api/equipment', tags=['equipment'])
app.include_router(inventory.router, prefix='/api/inventory', tags=['inventory'])
app.include_router(shipments.router, prefix='/api/shipments', tags=['shipments'])
app.include_router(expenses.router, prefix='/api/expenses', tags=['expenses'])
app.include_router(dashboard.router, prefix='/api/dashboard', tags=['dashboard'])
app.include_router(reports.router, prefix='/api/reports', tags=['reports'])
app.include_router(settings_router.router, prefix='/api/settings', tags=['settings'])
