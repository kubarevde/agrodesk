"""Tests for work-type / field helpers used by bot shift flows."""

from __future__ import annotations

from app.utils.references import find_by_name, is_field_work_type


def test_is_field_work_explicit_snake_case():
    assert is_field_work_type({'name': 'Любая', 'is_field_work': True}) is True
    assert is_field_work_type({'name': 'Любая', 'is_field_work': False}) is False


def test_is_field_work_camel_case():
    assert is_field_work_type({'name': 'Любая', 'isFieldWork': True}) is True
    assert is_field_work_type({'name': 'Любая', 'isFieldWork': False}) is False


def test_is_field_work_string_flags():
    assert is_field_work_type({'is_field_work': 'true'}) is True
    assert is_field_work_type({'is_field_work': 'false'}) is False


def test_is_field_work_heuristic_by_name_when_flag_missing():
    assert is_field_work_type({'name': 'Пахота'}) is True
    assert is_field_work_type({'name': 'Посев'}) is True
    assert is_field_work_type({'name': 'Склад'}) is False


def test_is_field_work_heuristic_by_category():
    assert is_field_work_type({'name': 'Кастом', 'category': 'полевые'}) is True
    assert is_field_work_type({'name': 'Кастом', 'category': 'склад'}) is False


def test_is_field_work_name_overrides_false_flag_for_known_types():
    # Known field-work names from migration backfill must still require a field,
    # even if a stale/partial payload says false.
    assert is_field_work_type({'name': 'Пахота', 'is_field_work': False}) is True


def test_find_by_name():
    items = [{'id': '1', 'name': 'Поле А'}, {'id': '2', 'name': 'Поле Б'}]
    assert find_by_name(items, 'Поле Б')['id'] == '2'
    assert find_by_name(items, 'нет такого') is None
