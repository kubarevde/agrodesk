"""Tenant holding endpoints — separate from /api/dashboard and /api/reports."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.schemas.holding import (
    HoldingChildResponse,
    HoldingOverviewResponse,
    HoldingReportCatalogItem,
    HoldingReportExportRequest,
    HoldingSwitchRequest,
    HoldingSwitchResponse,
)
from app.services.action_permissions import require_action
from app.services.holding import get_holding_overview, list_holding_children, require_head_org
from app.services.holding_reports import build_holding_report_workbook, catalog_payload
from app.services.holding_switch import (
    decode_bearer_payload,
    switch_back_to_head,
    switch_to_child,
)
from app.services.permissions import require_manager_section
from app.services.reports import workbook_response

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


@router.get('/children', response_model=list[HoldingChildResponse])
async def holding_children(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_action('holding.view')),
) -> list[HoldingChildResponse]:
    return await list_holding_children(db, get_org_id(request))


@router.get('/overview', response_model=HoldingOverviewResponse)
async def holding_overview(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_action('holding.view')),
) -> HoldingOverviewResponse:
    return await get_holding_overview(db, get_org_id(request))


@router.post('/switch', response_model=HoldingSwitchResponse)
async def holding_switch(
    request: Request,
    payload: HoldingSwitchRequest,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('holding.switch')),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> HoldingSwitchResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
        )
    token_payload = decode_bearer_payload(credentials.credentials)
    result = await switch_to_child(
        db,
        head_employee=current,
        head_org_id=get_org_id(request),
        child_org_id=payload.child_org_id,
        token_payload=token_payload,
    )
    await db.commit()
    return result


@router.post('/switch-back', response_model=HoldingSwitchResponse)
async def holding_switch_back(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> HoldingSwitchResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
        )
    token_payload = decode_bearer_payload(credentials.credentials)
    result = await switch_back_to_head(
        db,
        current_employee=current,
        current_org_id=get_org_id(request),
        token_payload=token_payload,
    )
    await db.commit()
    return result


@router.get('/reports/catalog', response_model=list[HoldingReportCatalogItem])
async def holding_reports_catalog(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_action('holding.view')),
    __: Employee = Depends(require_manager_section('reports')),
    ___: Employee = Depends(require_manager),
) -> list[HoldingReportCatalogItem]:
    await require_head_org(db, get_org_id(request))
    return [HoldingReportCatalogItem(**item) for item in catalog_payload()]


@router.post('/reports/export')
async def holding_reports_export(
    request: Request,
    payload: HoldingReportExportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_action('holding.view')),
    __: Employee = Depends(require_manager_section('reports')),
    ___: Employee = Depends(require_manager),
):
    workbook, filename = await build_holding_report_workbook(
        db,
        head_org_id=get_org_id(request),
        report_id=payload.report_id,
        mode=payload.mode,
        child_org_id=payload.child_org_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        month=payload.month,
        year=payload.year,
    )
    return workbook_response(workbook, filename)
