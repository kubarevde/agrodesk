from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=1)
    password: str
    org_id: UUID


class OrgPublicResponse(BaseModel):
    id: UUID
    name: str
    slug: str


class BotTokenRequest(BaseModel):
    telegram_id: int
    secret: str


class EmployeeMe(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_code: str
    full_name: str
    position: str | None = None
    role: str
    hourly_rate: float = 0


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    employee: EmployeeMe


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=4)
