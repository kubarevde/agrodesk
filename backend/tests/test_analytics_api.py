"""API smoke tests for analytics forecast/recommendations."""

from __future__ import annotations

import httpx


def test_forecast_endpoint(client: httpx.Client, manager_headers: dict[str, str]) -> None:
    r = client.get('/api/analytics/forecast', headers=manager_headers, params={'method': 'auto'})
    assert r.status_code == 200, r.text
    body = r.json()
    assert 'history' in body
    assert 'forecast' in body
    assert 'by_category' in body
    assert 'model_candidates' in body


def test_forecast_models_endpoint(client: httpx.Client, manager_headers: dict[str, str]) -> None:
    r = client.get('/api/analytics/forecast/models', headers=manager_headers)
    assert r.status_code == 200, r.text
    models = r.json()['models']
    ids = {m['id'] for m in models}
    assert 'moving_average' in ids
    assert 'auto' in ids


def test_recommendations_endpoint(client: httpx.Client, manager_headers: dict[str, str]) -> None:
    r = client.get('/api/analytics/recommendations', headers=manager_headers)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)
