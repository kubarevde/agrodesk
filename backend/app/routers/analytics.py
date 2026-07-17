from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.schemas.analytics import (
    ForecastBlock,
    ForecastIntervals,
    ForecastResponse,
    ModelsAvailabilityResponse,
    RecommendationItem,
)
from app.services.analytics_history import get_monthly_history
from app.services.forecasting import available_models, forecast_categories, forecast_field
from app.services.recommendations import build_recommendations
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('analytics'))])


@router.get('/forecast/models', response_model=ModelsAvailabilityResponse)
async def list_forecast_models(
    _: Employee = Depends(require_manager),
) -> ModelsAvailabilityResponse:
    return ModelsAvailabilityResponse(models=available_models())


@router.get('/forecast', response_model=ForecastResponse)
async def get_forecast(
    request: Request,
    months_ahead: int = Query(1, ge=1, le=3),
    method: str = Query('auto'),
    months_back: int = Query(18, ge=6, le=36),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ForecastResponse:
    org_id = get_org_id(request)
    history = await get_monthly_history(db, org_id, months_back=months_back)
    method = (method or 'auto').strip().lower()
    allowed = {m['id'] for m in available_models()}
    if method not in allowed:
        method = 'auto'

    expenses_f = forecast_field(history, 'total_expenses', periods_ahead=months_ahead, method=method)
    income_f = forecast_field(history, 'total_income', periods_ahead=months_ahead, method=method)
    margin_series = forecast_field(history, 'total_margin', periods_ahead=months_ahead, method=method)

    insufficient = bool(expenses_f.get('insufficient_data') or income_f.get('insufficient_data'))
    if insufficient:
        forecast = ForecastBlock(
            confidence_note=expenses_f.get('disclaimer')
            or income_f.get('disclaimer')
            or 'Недостаточно данных',
            insufficient_data=True,
            disclaimer=expenses_f.get('disclaimer') or income_f.get('disclaimer'),
            months_used=int(expenses_f.get('months_used') or len(history)),
        )
    else:
        pred_exp = float(expenses_f['predicted_value'] or 0)
        pred_inc = float(income_f['predicted_value'] or 0)
        # Prefer income-expenses; keep direct margin model as secondary note
        pred_margin = round(pred_inc - pred_exp, 2)
        forecast = ForecastBlock(
            predicted_expenses=pred_exp,
            predicted_income=pred_inc,
            predicted_margin=pred_margin,
            confidence_note=expenses_f.get('confidence_note') or '',
            model_used_expenses=expenses_f.get('model_name'),
            model_used_income=income_f.get('model_name'),
            model_used_margin='income_minus_expenses',
            selection_reason_expenses=expenses_f.get('selection_reason'),
            selection_reason_income=income_f.get('selection_reason'),
            backtest_metrics={
                'expenses': expenses_f.get('backtest_metrics') or [],
                'income': income_f.get('backtest_metrics') or [],
                'margin_direct': margin_series.get('backtest_metrics') or [],
            },
            intervals=ForecastIntervals(
                expenses_lower=expenses_f.get('lower_bound'),
                expenses_upper=expenses_f.get('upper_bound'),
                income_lower=income_f.get('lower_bound'),
                income_upper=income_f.get('upper_bound'),
            ),
            months_used=int(expenses_f.get('months_used') or len(history)),
        )

    by_category = forecast_categories(history, periods_ahead=months_ahead, method=method)
    return ForecastResponse(
        history=history,
        forecast=forecast,
        by_category=by_category,
        model_candidates=available_models(),
    )


@router.get('/recommendations', response_model=list[RecommendationItem])
async def get_recommendations(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[RecommendationItem]:
    org_id = get_org_id(request)
    rows = await build_recommendations(db, org_id)
    return [RecommendationItem.model_validate(row) for row in rows]
