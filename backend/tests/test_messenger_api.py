"""API tests for org messenger (direct/group chats, rights, org isolation)."""

from __future__ import annotations

import httpx
import pytest


def _employee_headers(client: httpx.Client, demo_org_id: str, code: str = 'EMP001') -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': code, 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _employee_id(client: httpx.Client, headers: dict[str, str]) -> str:
    me = client.get('/api/auth/me', headers=headers)
    assert me.status_code == 200, me.text
    return str(me.json()['id'])


def _other_employee_id(
    client: httpx.Client,
    admin_headers: dict[str, str],
    *,
    exclude_ids: set[str],
) -> str:
    employees = client.get('/api/employees', headers=admin_headers, params={'is_active': True})
    assert employees.status_code == 200, employees.text
    for row in employees.json():
        emp_id = str(row['id'])
        if emp_id not in exclude_ids:
            return emp_id
    raise AssertionError('Need another active employee in demo org')


def test_direct_chat_idempotent(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp = _employee_headers(client, demo_org_id, 'EMP001')
    peer = _employee_headers(client, demo_org_id, 'EMP002')
    emp_id = _employee_id(client, emp)
    peer_id = _employee_id(client, peer)

    first = client.post(
        '/api/messenger/chats/direct',
        headers=emp,
        json={'peer_employee_id': peer_id},
    )
    assert first.status_code == 200, first.text
    chat_id = first.json()['id']
    assert first.json()['type'] == 'direct'
    member_ids = {m['employee_id'] for m in first.json()['members']}
    assert emp_id in member_ids and peer_id in member_ids

    second = client.post(
        '/api/messenger/chats/direct',
        headers=peer,
        json={'peer_employee_id': emp_id},
    )
    assert second.status_code == 200, second.text
    assert second.json()['id'] == chat_id

    listed = client.get('/api/messenger/chats', headers=emp)
    assert listed.status_code == 200, listed.text
    assert any(item['id'] == chat_id for item in listed.json())


def test_create_group_forbidden_for_non_admin(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp = _employee_headers(client, demo_org_id, 'EMP001')
    peer_id = _other_employee_id(
        client,
        admin_headers,
        exclude_ids={_employee_id(client, emp)},
    )
    response = client.post(
        '/api/messenger/chats/group',
        headers=emp,
        json={'name': 'Полевая бригада', 'member_ids': [peer_id]},
    )
    assert response.status_code == 403, response.text


def test_add_member_forbidden_for_non_admin(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp = _employee_headers(client, demo_org_id, 'EMP001')
    emp_id = _employee_id(client, emp)
    peer_id = _other_employee_id(client, admin_headers, exclude_ids={emp_id})
    third_id = _other_employee_id(
        client, admin_headers, exclude_ids={emp_id, peer_id}
    )

    created = client.post(
        '/api/messenger/chats/group',
        headers=admin_headers,
        json={'name': 'Склад', 'member_ids': [emp_id, peer_id]},
    )
    assert created.status_code == 201, created.text
    chat_id = created.json()['id']

    denied = client.patch(
        f'/api/messenger/chats/{chat_id}',
        headers=emp,
        json={'add_member_ids': [third_id]},
    )
    assert denied.status_code == 403, denied.text

    allowed = client.patch(
        f'/api/messenger/chats/{chat_id}',
        headers=admin_headers,
        json={'add_member_ids': [third_id]},
    )
    assert allowed.status_code == 200, allowed.text
    member_ids = {m['employee_id'] for m in allowed.json()['members']}
    assert third_id in member_ids


def test_send_message_forbidden_for_non_member(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    outsider = _employee_headers(client, demo_org_id, 'EMP004')
    outsider_id = _employee_id(client, outsider)
    member = _employee_headers(client, demo_org_id, 'EMP001')
    member_id = _employee_id(client, member)

    created = client.post(
        '/api/messenger/chats/group',
        headers=admin_headers,
        json={'name': 'Только для своих', 'member_ids': [member_id]},
    )
    assert created.status_code == 201, created.text
    chat_id = created.json()['id']
    assert outsider_id not in {m['employee_id'] for m in created.json()['members']}

    denied = client.post(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=outsider,
        json={'body': 'Привет'},
    )
    assert denied.status_code == 403, denied.text

    ok = client.post(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=member,
        json={'body': 'Рабочий отчёт'},
    )
    assert ok.status_code == 201, ok.text
    assert ok.json()['body'] == 'Рабочий отчёт'

    history = client.get(f'/api/messenger/chats/{chat_id}/messages', headers=member)
    assert history.status_code == 200, history.text
    assert any(item['id'] == ok.json()['id'] for item in history.json()['items'])

    history_denied = client.get(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=outsider,
    )
    assert history_denied.status_code == 403, history_denied.text


def test_new_message_creates_notification_for_peer(
    client: httpx.Client,
    demo_org_id: str,
) -> None:
    sender = _employee_headers(client, demo_org_id, 'EMP001')
    peer = _employee_headers(client, demo_org_id, 'EMP002')
    peer_id = _employee_id(client, peer)

    chat = client.post(
        '/api/messenger/chats/direct',
        headers=sender,
        json={'peer_employee_id': peer_id},
    )
    assert chat.status_code == 200, chat.text
    chat_id = chat.json()['id']

    before = client.get('/api/notifications', headers=peer, params={'limit': 50})
    assert before.status_code == 200, before.text
    before_ids = {item['id'] for item in before.json()}

    sent = client.post(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=sender,
        json={'body': 'Проверка уведомления inbox'},
    )
    assert sent.status_code == 201, sent.text

    after = client.get('/api/notifications', headers=peer, params={'limit': 50})
    assert after.status_code == 200, after.text
    fresh = [item for item in after.json() if item['id'] not in before_ids]
    match = next((item for item in fresh if item.get('type') == 'new_message'), None)
    assert match is not None, after.text
    assert match['link'] == f'/messenger/{chat_id}'
    assert match.get('is_read') is False

    # Sender must not get a self-notification for this message
    sender_before = client.get('/api/notifications', headers=sender, params={'limit': 50})
    assert sender_before.status_code == 200, sender_before.text
    assert not any(
        item.get('type') == 'new_message'
        and item.get('link') == f'/messenger/{chat_id}'
        and 'Проверка уведомления inbox' in (item.get('body') or '')
        for item in sender_before.json()
    )


def test_admin_cannot_access_others_direct_chat(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    """Privacy: admin sees org groups for moderation, but not others' DM content."""
    emp = _employee_headers(client, demo_org_id, 'EMP001')
    peer = _employee_headers(client, demo_org_id, 'EMP002')
    emp_id = _employee_id(client, emp)
    peer_id = _employee_id(client, peer)
    admin_id = _employee_id(client, admin_headers)

    direct = client.post(
        '/api/messenger/chats/direct',
        headers=emp,
        json={'peer_employee_id': peer_id},
    )
    assert direct.status_code == 200, direct.text
    chat_id = direct.json()['id']
    assert admin_id not in {m['employee_id'] for m in direct.json()['members']}

    msg = client.post(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=emp,
        json={'body': 'Личная переписка'},
    )
    assert msg.status_code == 201, msg.text

    admin_list = client.get('/api/messenger/chats', headers=admin_headers)
    assert admin_list.status_code == 200, admin_list.text
    assert all(item['id'] != chat_id for item in admin_list.json())

    denied = client.get(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=admin_headers,
    )
    assert denied.status_code == 403, denied.text

    # Admin still lists group chats (including ones they own for moderation)
    group = client.post(
        '/api/messenger/chats/group',
        headers=admin_headers,
        json={'name': 'Модерация групп', 'member_ids': [emp_id]},
    )
    assert group.status_code == 201, group.text
    group_id = group.json()['id']
    listed = client.get('/api/messenger/chats', headers=admin_headers)
    assert listed.status_code == 200, listed.text
    assert any(item['id'] == group_id and item['type'] == 'group' for item in listed.json())


def test_group_create_writes_audit_log(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp = _employee_headers(client, demo_org_id, 'EMP001')
    emp_id = _employee_id(client, emp)
    created = client.post(
        '/api/messenger/chats/group',
        headers=admin_headers,
        json={'name': 'Аудит группа', 'member_ids': [emp_id]},
    )
    assert created.status_code == 201, created.text
    chat_id = created.json()['id']

    hist = client.get(
        f'/api/audit-log/entity/chat/{chat_id}',
        headers=admin_headers,
    )
    assert hist.status_code == 200, hist.text
    assert any(row.get('action') == 'create' for row in hist.json())


def test_messenger_org_isolation(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp = _employee_headers(client, demo_org_id, 'EMP001')
    peer_id = _other_employee_id(
        client,
        admin_headers,
        exclude_ids={_employee_id(client, emp)},
    )
    created = client.post(
        '/api/messenger/chats/direct',
        headers=emp,
        json={'peer_employee_id': peer_id},
    )
    assert created.status_code == 200, created.text
    chat_id = created.json()['id']

    msg = client.post(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=emp,
        json={'body': 'Секрет другой организации'},
    )
    assert msg.status_code == 201, msg.text

    orgs = client.get('/api/auth/orgs')
    assert orgs.status_code == 200
    other = next(
        (o for o in orgs.json() if o['id'] != demo_org_id and o.get('slug') == 'test-farm'),
        None,
    )
    if other is None:
        pytest.skip('test-farm org not seeded')

    login = client.post(
        '/api/auth/login',
        json={'email': 'EMP-TEST', 'password': '1234', 'org_id': other['id']},
    )
    assert login.status_code == 200, login.text
    other_headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

    listed = client.get('/api/messenger/chats', headers=other_headers)
    assert listed.status_code == 200, listed.text
    assert all(item['id'] != chat_id for item in listed.json())

    messages = client.get(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=other_headers,
    )
    assert messages.status_code in (403, 404), messages.text

    # Cross-org peer id must not create a direct chat
    foreign_direct = client.post(
        '/api/messenger/chats/direct',
        headers=other_headers,
        json={'peer_employee_id': peer_id},
    )
    assert foreign_direct.status_code == 400, foreign_direct.text


def test_mark_read_clears_unread(
    client: httpx.Client,
    demo_org_id: str,
) -> None:
    sender = _employee_headers(client, demo_org_id, 'EMP001')
    peer = _employee_headers(client, demo_org_id, 'EMP002')
    peer_id = _employee_id(client, peer)

    chat = client.post(
        '/api/messenger/chats/direct',
        headers=sender,
        json={'peer_employee_id': peer_id},
    )
    assert chat.status_code == 200, chat.text
    chat_id = chat.json()['id']

    sent = client.post(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=sender,
        json={'body': 'Unread check'},
    )
    assert sent.status_code == 201, sent.text
    message_id = sent.json()['id']
    assert sent.json().get('delivery_status') == 'delivered'

    listed = client.get('/api/messenger/chats', headers=peer)
    assert listed.status_code == 200, listed.text
    row = next(item for item in listed.json() if item['id'] == chat_id)
    assert row['unread_count'] >= 1

    read = client.post(
        f'/api/messenger/chats/{chat_id}/read',
        headers=peer,
        json={'last_read_message_id': message_id},
    )
    assert read.status_code == 200, read.text
    assert read.json()['last_read_message_id'] == message_id

    listed2 = client.get('/api/messenger/chats', headers=peer)
    assert listed2.status_code == 200, listed2.text
    row2 = next(item for item in listed2.json() if item['id'] == chat_id)
    assert row2['unread_count'] == 0

    # Sender sees delivery_status=read after peer marked the message.
    sender_msgs = client.get(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=sender,
    )
    assert sender_msgs.status_code == 200, sender_msgs.text
    mine = next(item for item in sender_msgs.json()['items'] if item['id'] == message_id)
    assert mine['delivery_status'] == 'read'


def test_send_message_delivery_status_delivered_until_read(
    client: httpx.Client,
    demo_org_id: str,
) -> None:
    sender = _employee_headers(client, demo_org_id, 'EMP001')
    peer = _employee_headers(client, demo_org_id, 'EMP002')
    peer_id = _employee_id(client, peer)

    chat = client.post(
        '/api/messenger/chats/direct',
        headers=sender,
        json={'peer_employee_id': peer_id},
    )
    assert chat.status_code == 200, chat.text
    chat_id = chat.json()['id']

    sent = client.post(
        f'/api/messenger/chats/{chat_id}/messages',
        headers=sender,
        json={'body': 'Ticks ticks'},
    )
    assert sent.status_code == 201, sent.text
    assert sent.json()['delivery_status'] == 'delivered'
    message_id = sent.json()['id']

    listed = client.get(f'/api/messenger/chats/{chat_id}/messages', headers=sender)
    assert listed.status_code == 200, listed.text
    row = next(item for item in listed.json()['items'] if item['id'] == message_id)
    assert row['delivery_status'] == 'delivered'


def test_messenger_peers_available_to_employee(
    client: httpx.Client,
    demo_org_id: str,
) -> None:
    emp = _employee_headers(client, demo_org_id, 'EMP001')
    emp_id = _employee_id(client, emp)
    peers = client.get('/api/messenger/peers', headers=emp)
    assert peers.status_code == 200, peers.text
    body = peers.json()
    assert isinstance(body, list)
    assert all(row['id'] != emp_id for row in body)
    assert any(row.get('full_name') for row in body)