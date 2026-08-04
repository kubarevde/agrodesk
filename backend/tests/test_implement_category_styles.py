"""Unit tests for implement category style resolution (settings JSONB, no ORM columns)."""

from __future__ import annotations

from app.services.implement_category_styles import resolve_style, styles_map


def test_resolve_style_defaults_for_known_codes() -> None:
    icon, color = resolve_style('harvest')
    assert icon == 'wheat'
    assert color == 'orange'


def test_resolve_style_settings_override() -> None:
    overrides = {'harvest': {'icon': 'truck', 'color': 'violet'}}
    icon, color = resolve_style('harvest', overrides)
    assert icon == 'truck'
    assert color == 'violet'


def test_resolve_style_unknown_without_override() -> None:
    icon, color = resolve_style('brand_new_cat')
    assert icon is None
    assert color is None


def test_resolve_style_unknown_with_override() -> None:
    overrides = {'brand_new_cat': {'icon': 'wrench', 'color': 'muted'}}
    icon, color = resolve_style('brand_new_cat', overrides)
    assert icon == 'wrench'
    assert color == 'muted'


def test_styles_map_filters_invalid() -> None:
    bag = {
        'implement_category_styles': {
            'sowing': {'icon': 'sprout', 'color': 'success'},
            'bad': {'icon': 'not-an-icon', 'color': 'blue'},
            'partial': {'icon': 'truck'},
        }
    }
    mapped = styles_map(bag)
    assert mapped['sowing'] == {'icon': 'sprout', 'color': 'success'}
    assert 'bad' not in mapped or 'icon' not in mapped.get('bad', {})
    assert mapped['partial'] == {'icon': 'truck'}
