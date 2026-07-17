"""Explainable multi-method forecasting engine (no external AI).

Methods: moving_average, linear_trend, ets, sarimax, prophet (optional).
Default mode: auto — pick best by holdout MAE/MAPE with preference for simpler models.
"""

from __future__ import annotations

import logging
import math
from dataclasses import asdict, dataclass
from typing import Any, Callable

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    HAS_STATSMODELS = True
except Exception:  # pragma: no cover
    HAS_STATSMODELS = False
    ExponentialSmoothing = None  # type: ignore[assignment,misc]

try:
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    HAS_SARIMAX = True
except Exception:  # pragma: no cover
    HAS_SARIMAX = False
    SARIMAX = None  # type: ignore[assignment,misc]

try:
    from prophet import Prophet

    HAS_PROPHET = True
except Exception:  # pragma: no cover
    HAS_PROPHET = False
    Prophet = None  # type: ignore[assignment,misc]


@dataclass
class ForecastPoint:
    predicted_value: float
    lower_bound: float
    upper_bound: float
    model_name: str
    method_note: str


@dataclass
class ModelScore:
    model_name: str
    mae: float
    rmse: float
    mape: float | None
    available: bool
    error: str | None = None


def available_models() -> list[dict[str, Any]]:
    return [
        {'id': 'moving_average', 'label': 'Скользящее среднее', 'available': True},
        {'id': 'linear_trend', 'label': 'Линейный тренд', 'available': True},
        {'id': 'ets', 'label': 'Exponential Smoothing (statsmodels)', 'available': HAS_STATSMODELS},
        {'id': 'sarimax', 'label': 'SARIMAX (statsmodels)', 'available': HAS_SARIMAX},
        {'id': 'prophet', 'label': 'Prophet', 'available': HAS_PROPHET},
        {'id': 'auto', 'label': 'Автовыбор', 'available': True},
    ]


def history_to_series(history: list[dict[str, Any]], field: str) -> pd.Series:
    index = pd.PeriodIndex([row['month'] for row in history], freq='M')
    values = [float(row.get(field) or 0.0) for row in history]
    return pd.Series(values, index=index, dtype=float)


def _safe_mape(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    mask = np.abs(actual) > 1e-9
    if not np.any(mask):
        return None
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def _metrics(actual: list[float], predicted: list[float]) -> tuple[float, float, float | None]:
    a = np.asarray(actual, dtype=float)
    p = np.asarray(predicted, dtype=float)
    mae = float(np.mean(np.abs(a - p)))
    rmse = float(math.sqrt(np.mean((a - p) ** 2)))
    return mae, rmse, _safe_mape(a, p)


def forecast_moving_average(series: pd.Series, periods: int = 1, window: int = 3) -> ForecastPoint:
    window = min(window, max(1, len(series)))
    mean = float(series.iloc[-window:].mean())
    std = float(series.iloc[-window:].std(ddof=0) or 0.0)
    band = max(std, abs(mean) * 0.1)
    return ForecastPoint(
        predicted_value=round(mean, 2),
        lower_bound=round(max(0.0, mean - band), 2),
        upper_bound=round(mean + band, 2),
        model_name='moving_average',
        method_note=f'Среднее за последние {window} мес.',
    )


def forecast_linear_trend(series: pd.Series, periods: int = 1) -> ForecastPoint:
    n = len(series)
    x = np.arange(n, dtype=float)
    y = series.to_numpy(dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    pred = float(slope * (n - 1 + periods) + intercept)
    residuals = y - (slope * x + intercept)
    std = float(np.std(residuals) or 0.0)
    band = max(std * 1.96, abs(pred) * 0.1)
    return ForecastPoint(
        predicted_value=round(pred, 2),
        lower_bound=round(pred - band, 2),
        upper_bound=round(pred + band, 2),
        model_name='linear_trend',
        method_note=f'Линейный тренд (slope={slope:.2f}/мес)',
    )


def forecast_ets(series: pd.Series, periods: int = 1) -> ForecastPoint:
    if not HAS_STATSMODELS or ExponentialSmoothing is None:
        raise RuntimeError('statsmodels недоступен')
    if len(series) < 4:
        raise RuntimeError('недостаточно точек для ETS')
    model = ExponentialSmoothing(
        series.astype(float),
        trend='add',
        seasonal=None,
        initialization_method='estimated',
    )
    fitted = model.fit(optimized=True)
    pred = fitted.forecast(periods)
    value = float(pred.iloc[-1])
    resid = np.asarray(fitted.resid, dtype=float)
    std = float(np.nanstd(resid) or 0.0)
    band = max(std * 1.96, abs(value) * 0.1)
    return ForecastPoint(
        predicted_value=round(value, 2),
        lower_bound=round(value - band, 2),
        upper_bound=round(value + band, 2),
        model_name='ets',
        method_note='Exponential Smoothing (Holt)',
    )


def forecast_sarimax(
    series: pd.Series,
    periods: int = 1,
    exog: pd.DataFrame | None = None,
    future_exog: pd.DataFrame | None = None,
) -> ForecastPoint:
    if not HAS_SARIMAX or SARIMAX is None:
        raise RuntimeError('SARIMAX недоступен')
    if len(series) < 6:
        raise RuntimeError('недостаточно точек для SARIMAX')
    seasonal = len(series) >= 12
    order = (1, 0, 1)
    seasonal_order = (1, 0, 0, 12) if seasonal else (0, 0, 0, 0)
    model = SARIMAX(
        series.astype(float),
        exog=exog,
        order=order,
        seasonal_order=seasonal_order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    fitted = model.fit(disp=False)
    forecast = fitted.get_forecast(steps=periods, exog=future_exog)
    mean = float(forecast.predicted_mean.iloc[-1])
    ci = forecast.conf_int(alpha=0.2)
    lower = float(ci.iloc[-1, 0])
    upper = float(ci.iloc[-1, 1])
    return ForecastPoint(
        predicted_value=round(mean, 2),
        lower_bound=round(lower, 2),
        upper_bound=round(upper, 2),
        model_name='sarimax',
        method_note='SARIMAX' + (' + сезонность 12' if seasonal else ''),
    )


def forecast_prophet(
    series: pd.Series,
    periods: int = 1,
    regressors: pd.DataFrame | None = None,
    future_regressors: dict[str, float] | None = None,
) -> ForecastPoint:
    if not HAS_PROPHET or Prophet is None:
        raise RuntimeError('Prophet недоступен')
    if len(series) < 12:
        raise RuntimeError('Prophet требует ≥12 месяцев')
    df = pd.DataFrame({'ds': series.index.to_timestamp(), 'y': series.to_numpy(dtype=float)})
    model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
    if regressors is not None:
        for col in regressors.columns:
            df[col] = regressors[col].to_numpy(dtype=float)
            model.add_regressor(col)
    model.fit(df)
    future = model.make_future_dataframe(periods=periods, freq='MS')
    if regressors is not None:
        for col in regressors.columns:
            hist = list(regressors[col].astype(float))
            fut_val = (future_regressors or {}).get(col, float(hist[-1] if hist else 0.0))
            future[col] = hist + [fut_val] * (len(future) - len(hist))
    forecast = model.predict(future)
    row = forecast.iloc[-1]
    return ForecastPoint(
        predicted_value=round(float(row['yhat']), 2),
        lower_bound=round(float(row['yhat_lower']), 2),
        upper_bound=round(float(row['yhat_upper']), 2),
        model_name='prophet',
        method_note='Prophet (тренд + годовая сезонность)',
    )


def _eligible_methods(n: int, requested: str) -> list[str]:
    if requested != 'auto':
        return [requested]
    methods = ['moving_average', 'linear_trend']
    if n >= 6 and HAS_STATSMODELS:
        methods.append('ets')
    if n >= 8 and HAS_SARIMAX:
        methods.append('sarimax')
    if n >= 12 and HAS_PROPHET:
        methods.append('prophet')
    return methods


def _run_method(
    name: str,
    series: pd.Series,
    periods: int,
    exog: pd.DataFrame | None,
    future_exog: pd.DataFrame | None,
) -> ForecastPoint:
    if name == 'moving_average':
        return forecast_moving_average(series, periods)
    if name == 'linear_trend':
        return forecast_linear_trend(series, periods)
    if name == 'ets':
        return forecast_ets(series, periods)
    if name == 'sarimax':
        return forecast_sarimax(series, periods, exog=exog, future_exog=future_exog)
    if name == 'prophet':
        fut = None
        if exog is not None and not exog.empty:
            fut = {col: float(exog[col].iloc[-1]) for col in exog.columns}
        return forecast_prophet(series, periods, regressors=exog, future_regressors=fut)
    raise ValueError(f'Неизвестный метод: {name}')


def evaluate_models(
    series: pd.Series,
    *,
    methods: list[str] | None = None,
    holdout: int = 1,
    exog: pd.DataFrame | None = None,
) -> list[ModelScore]:
    n = len(series)
    holdout = min(holdout, max(1, n // 3))
    if n < holdout + 3:
        return [
            ModelScore(m, mae=float('inf'), rmse=float('inf'), mape=None, available=False, error='мало данных')
            for m in (methods or ['moving_average'])
        ]

    train = series.iloc[:-holdout]
    test = series.iloc[-holdout:]
    train_exog = exog.iloc[:-holdout] if exog is not None else None
    scores: list[ModelScore] = []
    for name in methods or _eligible_methods(len(train), 'auto'):
        try:
            preds: list[float] = []
            for step in range(1, holdout + 1):
                sub = train if step == 1 else pd.concat([train, test.iloc[: step - 1]])
                sub_exog = None
                fut_exog = None
                if train_exog is not None and exog is not None:
                    sub_exog = exog.iloc[: len(sub)]
                    fut_exog = exog.iloc[len(sub) : len(sub) + 1]
                point = _run_method(name, sub, 1, sub_exog, fut_exog)
                preds.append(point.predicted_value)
            mae, rmse, mape = _metrics(list(test.astype(float)), preds)
            scores.append(ModelScore(name, mae=mae, rmse=rmse, mape=mape, available=True))
        except Exception as exc:  # noqa: BLE001
            logger.info('model %s failed evaluation: %s', name, exc)
            scores.append(
                ModelScore(name, mae=float('inf'), rmse=float('inf'), mape=None, available=False, error=str(exc))
            )
    scores.sort(key=lambda s: (s.mae, s.rmse))
    return scores


def select_best_model(scores: list[ModelScore]) -> tuple[str, str]:
    usable = [s for s in scores if s.available and math.isfinite(s.mae)]
    if not usable:
        return 'moving_average', 'Fallback: ни одна advanced-модель не сошлась'
    best = usable[0]
    # Prefer simpler model if within 10% MAE of best
    preference = ['moving_average', 'linear_trend', 'ets', 'sarimax', 'prophet']
    for name in preference:
        candidate = next((s for s in usable if s.model_name == name), None)
        if candidate and candidate.mae <= best.mae * 1.1:
            reason = (
                f'Выбран {name}: MAE={candidate.mae:.2f}'
                + (f', MAPE={candidate.mape:.1f}%' if candidate.mape is not None else '')
                + '. При близком качестве предпочитаем более простую модель.'
            )
            return name, reason
    reason = f'Выбран {best.model_name}: лучший MAE={best.mae:.2f} на holdout'
    return best.model_name, reason


def build_exog(history: list[dict[str, Any]]) -> pd.DataFrame | None:
    cols = ['critical_inventory_count', 'planned_workload', 'total_maintenance_cost']
    data = {col: [float(row.get(col) or 0.0) for row in history] for col in cols}
    if not history:
        return None
    index = pd.PeriodIndex([row['month'] for row in history], freq='M')
    return pd.DataFrame(data, index=index)


def forecast_field(
    history: list[dict[str, Any]],
    field: str,
    *,
    periods_ahead: int = 1,
    method: str = 'auto',
    use_exog: bool = True,
) -> dict[str, Any]:
    series = history_to_series(history, field)
    n = len(series)
    if n < 3:
        return {
            'insufficient_data': True,
            'months_used': n,
            'disclaimer': 'Недостаточно истории (нужно ≥3 месяцев) для прогноза.',
            'predicted_value': None,
            'model_name': None,
        }

    exog = build_exog(history) if use_exog else None
    methods = _eligible_methods(n, method)
    scores = evaluate_models(series, methods=methods, holdout=1, exog=exog)
    if method == 'auto':
        chosen, reason = select_best_model(scores)
    else:
        chosen, reason = method, f'Метод задан вручную: {method}'

    future_exog = None
    if exog is not None and chosen == 'sarimax':
        last = exog.iloc[[-1]].copy()
        future_exog = pd.concat([last] * periods_ahead, ignore_index=True)
        future_exog.index = pd.RangeIndex(periods_ahead)

    try:
        point = _run_method(chosen, series, periods_ahead, exog, future_exog)
    except Exception as exc:  # noqa: BLE001
        logger.warning('chosen model %s failed, fallback MA: %s', chosen, exc)
        point = forecast_moving_average(series, periods_ahead)
        reason = f'Fallback на moving_average после ошибки {chosen}: {exc}'

    return {
        'insufficient_data': False,
        'months_used': n,
        'predicted_value': point.predicted_value,
        'lower_bound': point.lower_bound,
        'upper_bound': point.upper_bound,
        'model_name': point.model_name,
        'method_note': point.method_note,
        'selection_reason': reason,
        'backtest_metrics': [asdict(s) for s in scores],
        'confidence_note': _confidence_note(n, point.model_name),
    }


def _confidence_note(months: int, model: str) -> str:
    if months < 6:
        level = 'ориентировочный (мало данных)'
    elif months < 12:
        level = 'умеренный'
    else:
        level = 'относительно надёжный при стабильной сезонности'
    return f'Использовано {months} мес., модель {model}, достоверность: {level}.'


def forecast_categories(
    history: list[dict[str, Any]],
    *,
    periods_ahead: int = 1,
    method: str = 'auto',
) -> list[dict[str, Any]]:
    """Forecast each expense category present in history.

    Categories come from Expense.category (normalized). Standard seed codes are
    always included; custom org dictionary codes appear when they have history.
    """
    from app.services.analytics_history import STANDARD_EXPENSE_CATEGORY_KEYS

    keys: set[str] = set(STANDARD_EXPENSE_CATEGORY_KEYS)
    for row in history:
        keys.update((row.get('by_category') or {}).keys())

    ordered = [k for k in STANDARD_EXPENSE_CATEGORY_KEYS if k in keys]
    ordered.extend(sorted(keys - set(STANDARD_EXPENSE_CATEGORY_KEYS)))

    results = []
    for key in ordered:
        cat_history = [
            {**row, '_cat': float((row.get('by_category') or {}).get(key) or 0.0)}
            for row in history
        ]
        nonzero = sum(1 for row in cat_history if row['_cat'] > 0)
        # Skip categories that never appear in expenses — avoid noise bars of zero
        if nonzero == 0 and key not in STANDARD_EXPENSE_CATEGORY_KEYS:
            continue
        cat_method = method
        if method == 'auto' and nonzero < 6:
            cat_method = 'moving_average'
        result = forecast_field(
            cat_history, '_cat', periods_ahead=periods_ahead, method=cat_method, use_exog=False
        )
        last_month = float((history[-1].get('by_category') or {}).get(key) or 0.0) if history else 0.0
        predicted = result.get('predicted_value')
        growth_pct = None
        if predicted is not None and last_month > 0:
            growth_pct = round((float(predicted) - last_month) / last_month * 100, 1)
        elif predicted is not None and last_month == 0 and float(predicted) > 0:
            growth_pct = 100.0
        results.append(
            {
                'category': key,
                **result,
                'last_month_value': round(last_month, 2),
                'growth_pct': growth_pct,
                'months_with_data': nonzero,
            }
        )
    return results


ForecastRunner = Callable[..., dict[str, Any]]
