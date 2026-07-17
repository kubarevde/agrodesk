"""Unit tests for forecasting methods and auto-selection."""

from __future__ import annotations

import math

import pandas as pd

from app.services.forecasting import (
    evaluate_models,
    forecast_field,
    forecast_linear_trend,
    forecast_moving_average,
    history_to_series,
    select_best_model,
)


def _rising_history(n: int = 12) -> list[dict]:
    rows = []
    for i in range(n):
        month = f'2025-{(i % 12) + 1:02d}' if n <= 12 else f'2024-{(i % 12) + 1:02d}'
        if n > 12:
            year = 2024 + i // 12
            month = f'{year}-{(i % 12) + 1:02d}'
        value = 1000 + i * 120
        rows.append(
            {
                'month': month,
                'total_expenses': value,
                'total_income': value + 400,
                'total_margin': 400,
                'critical_inventory_count': 0,
                'planned_workload': 1,
                'total_maintenance_cost': 50,
                'by_category': {'fuel': value * 0.3, 'other': value * 0.7},
            }
        )
    # Fix months to be continuous
    fixed = []
    start = pd.Period('2024-01', freq='M')
    for i in range(n):
        p = start + i
        value = 1000 + i * 120
        fixed.append(
            {
                'month': str(p),
                'total_expenses': float(value),
                'total_income': float(value + 400),
                'total_margin': 400.0,
                'critical_inventory_count': 0,
                'planned_workload': 1,
                'total_maintenance_cost': 50.0,
                'by_category': {'fuel': value * 0.3, 'other': value * 0.7},
            }
        )
    return fixed


def test_moving_average_short_series():
    series = history_to_series(_rising_history(4), 'total_expenses')
    point = forecast_moving_average(series, periods=1, window=3)
    assert point.model_name == 'moving_average'
    assert point.predicted_value > 0


def test_linear_trend_on_rising_series():
    series = history_to_series(_rising_history(8), 'total_expenses')
    point = forecast_linear_trend(series, periods=1)
    assert point.predicted_value > series.iloc[-1]


def test_evaluate_models_returns_ranking():
    series = history_to_series(_rising_history(10), 'total_expenses')
    scores = evaluate_models(series, methods=['moving_average', 'linear_trend'], holdout=1)
    assert len(scores) == 2
    assert scores[0].mae <= scores[1].mae or not scores[1].available


def test_select_best_prefers_simpler_when_close():
    from app.services.forecasting import ModelScore

    scores = [
        ModelScore('linear_trend', mae=10, rmse=12, mape=5, available=True),
        ModelScore('moving_average', mae=10.5, rmse=13, mape=5.2, available=True),
    ]
    name, reason = select_best_model(scores)
    assert name == 'moving_average'
    assert 'простую' in reason.lower() or 'moving_average' in reason


def test_forecast_field_auto_insufficient():
    result = forecast_field(_rising_history(2), 'total_expenses', method='auto')
    assert result['insufficient_data'] is True


def test_forecast_field_auto_ok():
    result = forecast_field(_rising_history(10), 'total_expenses', method='auto')
    assert result['insufficient_data'] is False
    assert result['predicted_value'] is not None
    assert result['model_name'] in {
        'moving_average',
        'linear_trend',
        'ets',
        'sarimax',
        'prophet',
    }
    assert math.isfinite(float(result['predicted_value']))
