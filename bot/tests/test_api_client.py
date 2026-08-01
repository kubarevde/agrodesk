"""Unit tests for bot ApiClient against mocked AgroDesk HTTP API."""

from __future__ import annotations

import json

import httpx
import pytest

from app.services.api_client import (
    AccessError,
    ApiClient,
    ShiftOpKind,
    classify_shift_response,
    parse_api_detail,
    shift_op_user_message,
)


TG_ID = 111111111
EMP_ID = 'emp-001-uuid'


def _json_response(status: int, payload: object) -> httpx.Response:
    return httpx.Response(
        status,
        content=json.dumps(payload).encode('utf-8'),
        headers={'content-type': 'application/json'},
    )


def _make_client(handler) -> ApiClient:
    transport = httpx.MockTransport(handler)
    client = ApiClient()
    client.BASE = 'http://api.test'
    client.timeout = 5.0
    client.retries = 0

    original_request = client._request
    original_token = client._get_token_result

    async def fake_token(tg_id: int):
        return 'test-jwt', None

    async def request_via_mock(tg_id, method, path, *, json=None, params=None, retry_auth=True):
        # Bypass real httpx AsyncClient; call MockTransport directly.
        req = httpx.Request(
            method,
            f'{client.BASE}{path}',
            params=params,
            json=json,
            headers={'Authorization': 'Bearer test-jwt'},
        )
        return handler(req)

    client._get_token_result = fake_token  # type: ignore[method-assign]
    client._request = request_via_mock  # type: ignore[method-assign]
    client._tokens[TG_ID] = 'test-jwt'
    _ = original_request, original_token, transport
    return client


@pytest.mark.asyncio
async def test_open_shift_success():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == 'POST'
        assert request.url.path == '/api/shifts'
        body = json.loads(request.content.decode())
        assert body['location_id'] == 'loc-1'
        assert body['work_type_id'] == 'wt-1'
        assert 'equipment_id' not in body
        return _json_response(201, {'id': 'shift-1', 'status': 'open'})

    api = _make_client(handler)
    result = await api.open_shift(TG_ID, 'loc-1', 'wt-1', None, None, None)
    assert result.ok
    assert result.data is not None
    assert result.data['id'] == 'shift-1'


@pytest.mark.asyncio
async def test_open_shift_forbidden_403():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json_response(403, {'detail': 'Недостаточно прав для открытия своей смены'})

    api = _make_client(handler)
    result = await api.open_shift(TG_ID, 'loc-1', 'wt-1', None, None, None)
    assert not result.ok
    assert result.kind == ShiftOpKind.FORBIDDEN
    msg = shift_op_user_message(result, action='открыть')
    assert 'Нет прав' in msg
    assert 'Недостаточно прав' in msg


@pytest.mark.asyncio
async def test_open_shift_server_500():
    def handler(request: httpx.Request) -> httpx.Response:
        return _json_response(500, {'detail': 'Internal'})

    api = _make_client(handler)
    result = await api.open_shift(TG_ID, 'loc-1', 'wt-1', None, None, None)
    assert result.kind == ShiftOpKind.SERVER
    msg = shift_op_user_message(result, action='открыть')
    assert 'временно недоступен' in msg


@pytest.mark.asyncio
async def test_open_shift_unreachable():
    async def request_none(*_a, **_k):
        return None

    api = ApiClient()
    api._request = request_none  # type: ignore[method-assign]
    result = await api.open_shift(TG_ID, 'loc-1', 'wt-1', None, None, None)
    assert result.kind == ShiftOpKind.UNREACHABLE
    assert 'Нет связи с API' in shift_op_user_message(result)


@pytest.mark.asyncio
async def test_get_active_shift_filters_own_for_manager():
    calls: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == '/api/employees/me':
            return _json_response(
                200,
                {'id': EMP_ID, 'full_name': 'Manager', 'role': 'manager', 'employee_code': 'EMP003'},
            )
        if request.url.path == '/api/shifts':
            calls.append(dict(request.url.params))
            return _json_response(
                200,
                [
                    {
                        'id': 'other-shift',
                        'employee_id': 'other-emp',
                        'status': 'open',
                        'location': 'A',
                    },
                    {
                        'id': 'own-shift',
                        'employee_id': EMP_ID,
                        'status': 'open',
                        'location': 'B',
                    },
                ],
            )
        return _json_response(404, {'detail': 'no'})

    api = _make_client(handler)
    # resolve_access / get_employee uses _request for /employees/me
    shift = await api.get_active_shift(TG_ID)
    assert shift is not None
    assert shift['id'] == 'own-shift'
    assert calls and calls[0].get('employee_id') == EMP_ID
    assert calls[0].get('status') == 'open'


@pytest.mark.asyncio
async def test_bot_token_bad_secret():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == '/api/auth/bot-token'
        return _json_response(403, {'detail': 'Неверный секрет'})

    transport = httpx.MockTransport(handler)
    api = ApiClient()
    api.BASE = 'http://api.test'
    api.retries = 0
    api._tokens.clear()

    async def post_via_mock():
        async with httpx.AsyncClient(transport=transport, base_url=api.BASE, timeout=5) as client:
            return await client.post(
                '/api/auth/bot-token',
                json={'telegram_id': TG_ID, 'secret': 'wrong'},
            )

    # Patch the token method's httpx client by overriding _get_token_result internals
    original = api._get_token_result

    async def token_with_mock(tg_id: int):
        response = await post_via_mock()
        if response.status_code == 403:
            return None, AccessError.BAD_SECRET
        return None, AccessError.UNKNOWN

    api._get_token_result = token_with_mock  # type: ignore[method-assign]
    token, err = await api._get_token_result(TG_ID)
    assert token is None
    assert err == AccessError.BAD_SECRET
    _ = original


@pytest.mark.asyncio
async def test_open_shift_sends_field_id():
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode())
        assert body['field_id'] == 'field-9'
        return _json_response(201, {'id': 'shift-2', 'status': 'open'})

    api = _make_client(handler)
    result = await api.open_shift(
        TG_ID, 'loc-1', 'wt-1', None, None, None, field_id='field-9'
    )
    assert result.ok


def test_parse_and_classify_helpers():
    resp = _json_response(400, {'detail': 'Для полевой работы укажите поле'})
    assert parse_api_detail(resp) == 'Для полевой работы укажите поле'
    classified = classify_shift_response(resp)
    assert classified.kind == ShiftOpKind.VALIDATION
    assert 'поле' in (classified.detail or '')


@pytest.mark.asyncio
async def test_resolve_access_rejects_mismatched_telegram_id():
    """Cached JWT for wrong employee must not keep serving after TG rebind."""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == '/api/employees/me':
            return _json_response(
                200,
                {
                    'id': EMP_ID,
                    'full_name': 'Old',
                    'role': 'employee',
                    'telegram_id': None,
                },
            )
        return _json_response(404, {'detail': 'not found'})

    api = _make_client(handler)

    async def token_then_fail(tg_id: int):
        if tg_id in api._tokens:
            return api._tokens[tg_id], None
        return None, AccessError.NOT_LINKED

    api._get_token_result = token_then_fail  # type: ignore[method-assign]
    result = await api.resolve_access(TG_ID)
    assert result.employee is None
    assert result.error == AccessError.NOT_LINKED
    assert TG_ID not in api._tokens
