"""Holding overview schemas — allowlisted aggregates only (no marketplace / PII lists)."""

from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import EmployeeMe


class HoldingChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    link_id: UUID
    org_id: UUID
    name: str
    slug: str
    is_active: bool


class HoldingChildSummary(BaseModel):
    """Per-child KPI strip for holding overview (counts / totals only)."""

    org_id: UUID
    name: str
    slug: str
    is_active: bool
    employees_count: int = 0
    active_shifts_count: int = 0
    month_shifts_count: int = 0
    month_hours: float = 0.0
    month_shipments_kg: float = 0.0
    month_shipments_sum: float = 0.0
    month_expenses_sum: float = 0.0
    critical_inventory_count: int = 0
    shipment_requests_active: int = 0


class HoldingOverviewResponse(BaseModel):
    head_org_id: UUID
    children: list[HoldingChildSummary] = Field(default_factory=list)
    totals: HoldingChildSummary | None = None


class HoldingSwitchRequest(BaseModel):
    child_org_id: UUID


class HoldingSwitchResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    employee: EmployeeMe
    mode: Literal['child', 'head']
    current_org_id: UUID
    current_org_name: str
    head_org_id: UUID | None = None
    head_org_name: str | None = None


class HoldingReportCatalogItem(BaseModel):
    report_id: str
    title: str
    period_mode: Literal['range', 'month', 'year']
    modes: list[Literal['child', 'group']]
    group_unsupported_reason: str | None = None


class HoldingReportExportRequest(BaseModel):
    report_id: str = Field(min_length=1, max_length=64)
    mode: Literal['child', 'group']
    child_org_id: UUID | None = None
    from_date: date | None = None
    to_date: date | None = None
    month: str | None = Field(default=None, pattern=r'^\d{4}-\d{2}$')
    year: int | None = Field(default=None, ge=2000, le=2100)
