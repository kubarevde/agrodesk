"""Field name normalization and uniqueness helpers."""

from app.models.dictionary import normalize_name


def test_normalize_name_compost() -> None:
    assert normalize_name('1815 компост') == '1815 компост'
    assert normalize_name('  1815   компост  ') == '1815 компост'
    assert normalize_name('1815\u00a0компост') == '1815 компост'


def test_normalize_name_idempotent() -> None:
    value = '1815 компост'
    assert normalize_name(normalize_name(value)) == value
