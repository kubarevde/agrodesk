from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import get_current_employee
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard import get_dashboard_stats
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('dashboard'))])


@router.get('/stats', response_model=DashboardStatsResponse)
async def dashboard_stats(
    request: Request,
    current: Employee = Depends(get_current_employee),
) -> DashboardStatsResponse:
    return await get_dashboard_stats(current.id, get_org_id(request))
