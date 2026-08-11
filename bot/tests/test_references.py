"""Tests for work-type / field helpers used by bot shift flows."""

from __future__ import annotations

from app.utils.references import (
    FIELD_WORK_LOCATION_CODE,
    apply_field_work_location,
    find_by_name,
    find_field_work_location,
    is_field_work_type,
)


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


def test_is_field_work_explicit_false_wins_over_name():
    # Web/API: WorkType.is_field_work is the source of truth (prompt 15.5).
    assert is_field_work_type({'name': 'Пахота', 'is_field_work': False}) is False
    assert is_field_work_type({'name': 'Пахота', 'isFieldWork': False}) is False


def test_find_field_work_location_prefers_code():
    locations = [
        {'id': '1', 'name': 'Полевая работа', 'is_system': True},
        {'id': '2', 'name': 'Полевая работа', 'code': FIELD_WORK_LOCATION_CODE, 'is_system': True},
        {'id': '3', 'name': 'Склад'},
    ]
    found = find_field_work_location(locations)
    assert found is not None
    assert found['id'] == '2'


def test_apply_field_work_location():
    locations = [
        {'id': 'fw', 'name': 'Полевая работа', 'code': 'field_work'},
    ]
    assert apply_field_work_location(locations) == ('fw', 'Полевая работа')
    assert apply_field_work_location([]) is None


def test_find_by_name():
    items = [{'id': '1', 'name': 'Поле А'}, {'id': '2', 'name': 'Поле Б'}]
    assert find_by_name(items, 'Поле Б')['id'] == '2'
    assert find_by_name(items, 'нет такого') is None
