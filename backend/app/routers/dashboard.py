from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_employee
from app.models.employee import Employee
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard import get_dashboard_stats

router = APIRouter()


@router.get('/stats', response_model=DashboardStatsResponse)
async def dashboard_stats(_: Employee = Depends(get_current_employee)) -> DashboardStatsResponse:
    return await get_dashboard_stats()
