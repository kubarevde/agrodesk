"""Unit checks for harvest category dedupe helpers (migration 051)."""

from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_migration():
    path = (
        Path(__file__).resolve().parents[1]
        / 'alembic'
        / 'versions'
        / '051_harvest_category_dedupe.py'
    )
    spec = importlib.util.spec_from_file_location('m051_harvest_category_dedupe', path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_duplicate_harvest_names_detected() -> None:
    m = _load_migration()
    assert m.is_duplicate_harvest_category_name('Урожай на складе')
    assert m.is_duplicate_harvest_category_name('Урожай')
    assert m.is_duplicate_harvest_category_name('  Урожай  (на складе)  ')
    assert not m.is_duplicate_harvest_category_name('Топливо')
    assert not m.is_duplicate_harvest_category_name('')


def test_canonical_name_normalizes_like_duplicate() -> None:
    m = _load_migration()
    assert m.normalize_harvest_category_name('Урожай (на складе)') == 'урожай на складе'
    assert m.normalize_harvest_category_name('Урожай на складе') == 'урожай на складе'
