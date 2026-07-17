from typing import Any

from pydantic import BaseModel, Field


class ForecastIntervals(BaseModel):
    expenses_lower: float | None = None
    expenses_upper: float | None = None
    income_lower: float | None = None
    income_upper: float | None = None


class ForecastBlock(BaseModel):
    predicted_expenses: float | None = None
    predicted_income: float | None = None
    predicted_margin: float | None = None
    confidence_note: str
    model_used_expenses: str | None = None
    model_used_income: str | None = None
    model_used_margin: str | None = None
    selection_reason_expenses: str | None = None
    selection_reason_income: str | None = None
    backtest_metrics: dict[str, Any] = Field(default_factory=dict)
    intervals: ForecastIntervals = Field(default_factory=ForecastIntervals)
    insufficient_data: bool = False
    disclaimer: str | None = None
    months_used: int = 0


class ForecastResponse(BaseModel):
    history: list[dict[str, Any]]
    forecast: ForecastBlock
    by_category: list[dict[str, Any]]
    model_candidates: list[dict[str, Any]]


class RecommendationItem(BaseModel):
    title: str
    explanation: str
    level: str
    why_numbers: dict[str, Any] = Field(default_factory=dict)
    suggested_action: str
    related_entity_type: str | None = None
    related_entity_id: str | None = None


class ModelsAvailabilityResponse(BaseModel):
    models: list[dict[str, Any]]
