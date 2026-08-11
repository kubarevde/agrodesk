"""Unit checks for org timezone catalog (8.6)."""

from __future__ import annotations

from zoneinfo import ZoneInfo

from app.services.org_timezone import AVAILABLE_TIMEZONES, TIMEZONE_LABELS_RU, validate_timezone_name


def test_available_timezones_are_valid_iana() -> None:
    for tz in AVAILABLE_TIMEZONES:
        ZoneInfo(tz)


def test_available_timezones_cover_rf_span() -> None:
    assert 'Europe/Kaliningrad' in AVAILABLE_TIMEZONES
    assert 'Europe/Moscow' in AVAILABLE_TIMEZONES
    assert 'Asia/Kamchatka' in AVAILABLE_TIMEZONES
    assert 'Asia/Anadyr' in AVAILABLE_TIMEZONES
    assert len(AVAILABLE_TIMEZONES) >= 30


def test_every_zone_has_ru_label() -> None:
    for tz in AVAILABLE_TIMEZONES:
        assert tz in TIMEZONE_LABELS_RU


def test_validate_timezone_name_accepts_catalog() -> None:
    assert validate_timezone_name('Europe/Moscow') == 'Europe/Moscow'
