from datetime import date as date_type
from uuid import UUID

from pydantic import BaseModel, Field


class DateRangeRequest(BaseModel):
    from_date: date_type
    to_date: date_type


class TimesheetReportRequest(DateRangeRequest):
    employee_id: UUID | None = None


class MonthReportRequest(BaseModel):
    month: str = Field(pattern=r'^\d{4}-\d{2}$')


class EquipmentReportRequest(DateRangeRequest):
    equipment_id: UUID | None = None


class FieldsReportRequest(DateRangeRequest):
    field_id: UUID | None = None


class SeasonReportRequest(BaseModel):
    year: int = Field(ge=2000, le=2100)
