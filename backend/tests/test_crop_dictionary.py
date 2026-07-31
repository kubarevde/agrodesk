"""Unit tests for crop name/code resolution (no DB)."""

from __future__ import annotations

from types import SimpleNamespace

from app.services.crop_dictionary import resolve_crop_pair, unique_name_to_code


def _row(code: str, name: str) -> SimpleNamespace:
    return SimpleNamespace(code=code, name=name)


def test_unique_name_to_code_skips_ambiguous() -> None:
    rows = [
        _row('wheat', 'Пшеница'),
        _row('wheat_soft', 'Пшеница'),
        _row('corn', 'Кукуруза'),
    ]
    mapping = unique_name_to_code(rows)  # type: ignore[arg-type]
    assert 'кукуруза' in mapping
    assert mapping['кукуруза'] == 'corn'
    assert 'пшеница' not in mapping


def test_resolve_prefers_code() -> None:
    rows = [_row('wheat', 'Пшеница'), _row('corn', 'Кукуруза')]
    name, code = resolve_crop_pair(rows, crop_type='wrong', crop_code='wheat')  # type: ignore[arg-type]
    assert code == 'wheat'
    assert name == 'Пшеница'


def test_resolve_from_unique_name() -> None:
    rows = [_row('wheat', 'Пшеница')]
    name, code = resolve_crop_pair(rows, crop_type='Пшеница', crop_code=None)  # type: ignore[arg-type]
    assert code == 'wheat'
    assert name == 'Пшеница'
