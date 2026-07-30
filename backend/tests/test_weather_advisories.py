"""Unit tests for weather advisories (synthetic forecast, no HTTP)."""

from datetime import date

from app.services.weather.advisories import (
    ForecastDayMetrics,
    build_advisories_for_plan,
    is_spray_work,
    iter_plan_dates,
    max_wind_from_day_forecast,
    merge_wind,
    metrics_from_month_days,
)


def test_is_spray_work_detects_russian_and_latin():
    assert is_spray_work('Опрыскивание')
    assert is_spray_work('Гербицидная обработка')
    assert is_spray_work('Spray application')
    assert not is_spray_work('Культивация')
    assert not is_spray_work(None)


def test_iter_plan_dates_single_and_range():
    assert iter_plan_dates(date(2026, 7, 10), None) == [date(2026, 7, 10)]
    days = iter_plan_dates(date(2026, 7, 10), date(2026, 7, 12))
    assert days == [date(2026, 7, 10), date(2026, 7, 11), date(2026, 7, 12)]


def test_metrics_from_month_days():
    mapped = metrics_from_month_days(
        [
            {
                'date': '2026-07-10',
                'tempMin': -1.5,
                'tempMax': 4.0,
                'precipitationMm': 12.0,
            }
        ]
    )
    assert '2026-07-10' in mapped
    assert mapped['2026-07-10'].temp_min == -1.5
    assert mapped['2026-07-10'].precipitation_mm == 12.0
    assert mapped['2026-07-10'].wind_speed_ms is None


def test_max_wind_from_day_forecast_takes_max_ok_slots():
    wind = max_wind_from_day_forecast(
        {
            'sources': [
                {
                    'ok': True,
                    'morning': {'windSpeedMs': 3.0},
                    'day': {'windSpeedMs': 8.5},
                    'evening': {'windSpeedMs': 4.0},
                },
                {
                    'ok': False,
                    'day': {'windSpeedMs': 99.0},
                },
            ]
        }
    )
    assert wind == 8.5


def test_frost_warning_on_planned_day():
    forecast = {
        '2026-07-15': ForecastDayMetrics(
            date='2026-07-15',
            temp_min=-2.0,
            temp_max=3.0,
            precipitation_mm=0.0,
        )
    }
    items = build_advisories_for_plan(
        planned_date=date(2026, 7, 15),
        planned_end_date=None,
        work_type_name='Культивация',
        forecast_by_date=forecast,
    )
    codes = [a.code for a in items]
    assert 'frost' in codes
    frost = next(a for a in items if a.code == 'frost')
    assert frost.severity == 'warning'
    assert frost.temp_min == -2.0


def test_no_frost_when_temp_non_negative():
    forecast = {
        '2026-07-15': ForecastDayMetrics(
            date='2026-07-15',
            temp_min=0.0,
            temp_max=8.0,
            precipitation_mm=0.0,
        )
    }
    items = build_advisories_for_plan(
        planned_date=date(2026, 7, 15),
        planned_end_date=None,
        work_type_name='Посев',
        forecast_by_date=forecast,
    )
    assert all(a.code != 'frost' for a in items)


def test_heavy_and_moderate_rain():
    heavy = build_advisories_for_plan(
        planned_date=date(2026, 7, 16),
        planned_end_date=None,
        work_type_name='Боронование',
        forecast_by_date={
            '2026-07-16': ForecastDayMetrics(
                date='2026-07-16',
                temp_min=12.0,
                temp_max=18.0,
                precipitation_mm=11.0,
            )
        },
    )
    assert any(a.code == 'heavy_rain' and a.severity == 'warning' for a in heavy)

    moderate = build_advisories_for_plan(
        planned_date=date(2026, 7, 16),
        planned_end_date=None,
        work_type_name='Боронование',
        forecast_by_date={
            '2026-07-16': ForecastDayMetrics(
                date='2026-07-16',
                temp_min=12.0,
                temp_max=18.0,
                precipitation_mm=6.0,
            )
        },
    )
    assert any(a.code == 'heavy_rain' and a.severity == 'info' for a in moderate)


def test_wind_only_for_spray_work():
    forecast = {
        '2026-07-17': ForecastDayMetrics(
            date='2026-07-17',
            temp_min=14.0,
            temp_max=22.0,
            precipitation_mm=0.0,
            wind_speed_ms=8.0,
        )
    }
    spray = build_advisories_for_plan(
        planned_date=date(2026, 7, 17),
        planned_end_date=None,
        work_type_name='Опрыскивание',
        forecast_by_date=forecast,
    )
    assert any(a.code == 'strong_wind_spray' and a.severity == 'warning' for a in spray)

    tillage = build_advisories_for_plan(
        planned_date=date(2026, 7, 17),
        planned_end_date=None,
        work_type_name='Культивация',
        forecast_by_date=forecast,
    )
    assert all(a.code != 'strong_wind_spray' for a in tillage)


def test_moderate_wind_info_for_spray():
    items = build_advisories_for_plan(
        planned_date=date(2026, 7, 18),
        planned_end_date=None,
        work_type_name='Опрыскивание',
        forecast_by_date={
            '2026-07-18': ForecastDayMetrics(
                date='2026-07-18',
                temp_min=15.0,
                temp_max=24.0,
                precipitation_mm=0.0,
                wind_speed_ms=5.5,
            )
        },
    )
    wind = next(a for a in items if a.code == 'strong_wind_spray')
    assert wind.severity == 'info'


def test_combined_frost_rain_spray_wind():
    day = '2026-07-20'
    metrics = merge_wind(
        ForecastDayMetrics(
            date=day,
            temp_min=-1.0,
            temp_max=2.0,
            precipitation_mm=15.0,
            wind_speed_ms=None,
        ),
        9.0,
    )
    items = build_advisories_for_plan(
        planned_date=date(2026, 7, 20),
        planned_end_date=None,
        work_type_name='Опрыскивание',
        forecast_by_date={day: metrics},
    )
    codes = {a.code for a in items}
    assert codes == {'frost', 'heavy_rain', 'strong_wind_spray'}


def test_missing_forecast_day_yields_empty():
    items = build_advisories_for_plan(
        planned_date=date(2026, 7, 21),
        planned_end_date=None,
        work_type_name='Опрыскивание',
        forecast_by_date={},
    )
    assert items == []


def test_advisory_titles_match_ui_copy():
    """Titles shown in PlanWeatherAdvisoryBadge must stay stable for UX."""
    frost = build_advisories_for_plan(
        planned_date=date(2026, 7, 22),
        planned_end_date=None,
        work_type_name='Посев',
        forecast_by_date={
            '2026-07-22': ForecastDayMetrics(
                date='2026-07-22',
                temp_min=-0.1,
                temp_max=5.0,
                precipitation_mm=0.0,
            )
        },
    )
    assert frost[0].title == 'Заморозки'
    assert frost[0].severity == 'warning'

    rain_warn = build_advisories_for_plan(
        planned_date=date(2026, 7, 22),
        planned_end_date=None,
        work_type_name='Посев',
        forecast_by_date={
            '2026-07-22': ForecastDayMetrics(
                date='2026-07-22',
                temp_min=10.0,
                temp_max=16.0,
                precipitation_mm=10.0,
            )
        },
    )
    assert any(a.title == 'Сильные осадки' and a.severity == 'warning' for a in rain_warn)

    rain_info = build_advisories_for_plan(
        planned_date=date(2026, 7, 22),
        planned_end_date=None,
        work_type_name='Посев',
        forecast_by_date={
            '2026-07-22': ForecastDayMetrics(
                date='2026-07-22',
                temp_min=10.0,
                temp_max=16.0,
                precipitation_mm=5.0,
            )
        },
    )
    assert any(a.title == 'Осадки' and a.severity == 'info' for a in rain_info)

    wind = build_advisories_for_plan(
        planned_date=date(2026, 7, 22),
        planned_end_date=None,
        work_type_name='Опрыскивание',
        forecast_by_date={
            '2026-07-22': ForecastDayMetrics(
                date='2026-07-22',
                temp_min=12.0,
                temp_max=20.0,
                precipitation_mm=0.0,
                wind_speed_ms=7.0,
            )
        },
    )
    assert any(a.title == 'Сильный ветер' and a.severity == 'warning' for a in wind)


def test_threshold_boundaries_exact():
    """Boundary values must match documented thresholds used by the calendar UI."""
    from app.services.weather.advisories import (
        FROST_TEMP_C,
        HEAVY_RAIN_MM,
        MODERATE_RAIN_MM,
        MODERATE_WIND_MS,
        STRONG_WIND_MS,
    )

    assert FROST_TEMP_C == 0.0
    assert HEAVY_RAIN_MM == 10.0
    assert MODERATE_RAIN_MM == 5.0
    assert STRONG_WIND_MS == 7.0
    assert MODERATE_WIND_MS == 5.0

    # Exactly 0°C — no frost
    assert (
        build_advisories_for_plan(
            planned_date=date(2026, 7, 23),
            planned_end_date=None,
            work_type_name='Посев',
            forecast_by_date={
                '2026-07-23': ForecastDayMetrics(
                    date='2026-07-23',
                    temp_min=0.0,
                    precipitation_mm=0.0,
                )
            },
        )
        == []
    )

    # Just below rain info threshold — empty
    assert (
        build_advisories_for_plan(
            planned_date=date(2026, 7, 23),
            planned_end_date=None,
            work_type_name='Посев',
            forecast_by_date={
                '2026-07-23': ForecastDayMetrics(
                    date='2026-07-23',
                    temp_min=8.0,
                    precipitation_mm=4.9,
                )
            },
        )
        == []
    )

    # Just below spray wind info — empty
    assert (
        build_advisories_for_plan(
            planned_date=date(2026, 7, 23),
            planned_end_date=None,
            work_type_name='Опрыскивание',
            forecast_by_date={
                '2026-07-23': ForecastDayMetrics(
                    date='2026-07-23',
                    temp_min=12.0,
                    precipitation_mm=0.0,
                    wind_speed_ms=4.9,
                )
            },
        )
        == []
    )


def test_should_compute_advisories_gates():
    from types import SimpleNamespace

    from app.services.weather.plan_advisories import should_compute_advisories

    assert should_compute_advisories(SimpleNamespace(entry_kind='plan', status='planned'))
    assert should_compute_advisories(SimpleNamespace(entry_kind='plan', status='in_progress'))
    assert not should_compute_advisories(SimpleNamespace(entry_kind='fact', status='planned'))
    assert not should_compute_advisories(SimpleNamespace(entry_kind='plan', status='done'))
    assert not should_compute_advisories(SimpleNamespace(entry_kind='plan', status='cancelled'))
