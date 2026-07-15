from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.employee import EmployeeRole


class EmployeeCreate(BaseModel):
    employee_code: str = Field(min_length=1, max_length=20)
    full_name: str = Field(min_length=1, max_length=200)
    position: str | None = Field(default=None, max_length=100)
    hourly_rate: Decimal = Field(default=Decimal('0'), ge=0)
    role: EmployeeRole = EmployeeRole.employee
    password: str = Field(default='1234', min_length=4)


class EmployeeUpdate(BaseModel):
    employee_code: str | None = Field(default=None, min_length=1, max_length=20)
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    position: str | None = Field(default=None, max_length=100)
    hourly_rate: Decimal | None = Field(default=None, ge=0)
    role: EmployeeRole | None = None
    password: str | None = Field(default=None, min_length=4)
    is_active: bool | None = None
    telegram_id: int | None = None


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_code: str
    full_name: str
    position: str | None = None
    hourly_rate: Decimal
    role: str
    is_active: bool
    telegram_id: int | None = None


class LinkTelegramRequest(BaseModel):
    telegram_id: int
