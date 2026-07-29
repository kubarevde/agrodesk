"""Support tickets smoke: create → staff list/reply → user sees reply."""

from __future__ import annotations

import os
from pathlib import Path

import httpx
import pytest


def _load_dotenv_if_present() -> None:
    env_path = Path(__file__).resolve().parents[1] / '.env'
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding='utf-8').splitlines():
        raw = line.strip()
        if not raw or raw.startswith('#') or '=' not in raw:
            continue
        key, _, value = raw.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _superadmin_headers(client: httpx.Client) -> dict[str, str] | None:
    _load_dotenv_if_present()
    email = (os.environ.get('SUPERADMIN_EMAIL') or '').strip()
    password = (os.environ.get('SUPERADMIN_PASSWORD') or '').strip()
    if not email or not password:
        return None
    r = client.post(
        '/superadmin/api/auth/login',
        json={'email': email, 'password': password},
    )
    if r.status_code != 200:
        return None
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _create_ticket(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    subject: str = 'Тест поддержки API',
    category: str = 'bug',
) -> dict:
    r = client.post(
        '/api/support/tickets',
        headers=headers,
        json={
            'category': category,
            'subject': subject,
            'body': 'Подробное описание проблемы для smoke-теста поддержки.',
            'priority': 'normal',
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_user_creates_ticket_and_sees_own_only(
    client: httpx.Client,
    manager_headers: dict[str, str],
    admin_headers: dict[str, str],
) -> None:
    ticket = _create_ticket(client, manager_headers)
    assert ticket['status'] == 'new'
    assert ticket['unread_for_staff'] is True
    assert ticket['unread_for_user'] is False
    assert ticket['last_message_preview']
    ticket_id = ticket['id']

    mine = client.get('/api/support/tickets', headers=manager_headers)
    assert mine.status_code == 200, mine.text
    assert any(t['id'] == ticket_id for t in mine.json())

    # Author-only list stays author-scoped even for org admin
    admin_list = client.get('/api/support/tickets', headers=admin_headers)
    assert admin_list.status_code == 200, admin_list.text
    assert all(t['id'] != ticket_id for t in admin_list.json())

    # Admin has support.view_org_tickets → can open org ticket, but cannot reply
    other = client.get(f'/api/support/tickets/{ticket_id}', headers=admin_headers)
    assert other.status_code == 200, other.text
    assert other.json()['id'] == ticket_id

    reply_forbidden = client.post(
        f'/api/support/tickets/{ticket_id}/messages',
        headers=admin_headers,
        json={'body': 'Попытка ответить в чужой тикет'},
    )
    assert reply_forbidden.status_code == 403, reply_forbidden.text


def test_superadmin_inbox_reply_unread_and_close(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    staff = _superadmin_headers(client)
    if staff is None:
        pytest.skip('SUPERADMIN_EMAIL/PASSWORD not configured')

    ticket = _create_ticket(client, manager_headers, subject='Как сменить роль', category='how_to')
    ticket_id = ticket['id']

    unread_before = client.get('/superadmin/api/support/unread-count', headers=staff)
    assert unread_before.status_code == 200, unread_before.text
    assert unread_before.json()['count'] >= 1

    inbox = client.get(
        '/superadmin/api/support/tickets',
        headers=staff,
        params={'unread_only': True},
    )
    assert inbox.status_code == 200, inbox.text
    assert any(t['id'] == ticket_id for t in inbox.json())

    detail = client.get(f'/superadmin/api/support/tickets/{ticket_id}', headers=staff)
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body['status'] == 'in_progress'
    assert body['unread_for_staff'] is False
    assert body['assignee_superadmin_id']

    replied = client.post(
        f'/superadmin/api/support/tickets/{ticket_id}/messages',
        headers=staff,
        json={'body': 'Откройте Настройки → Сотрудники и измените роль.'},
    )
    assert replied.status_code == 200, replied.text
    assert replied.json()['status'] == 'waiting_user'
    assert replied.json()['unread_for_user'] is True
    assert replied.json()['unread_for_staff'] is False

    user_unread = client.get('/api/support/unread-count', headers=manager_headers)
    assert user_unread.status_code == 200
    assert user_unread.json()['count'] >= 1

    user_view = client.get(f'/api/support/tickets/{ticket_id}', headers=manager_headers)
    assert user_view.status_code == 200, user_view.text
    assert user_view.json()['unread_for_user'] is False
    bodies = [m['body'] for m in user_view.json()['messages']]
    assert any('Настройки' in b for b in bodies)

    user_reply = client.post(
        f'/api/support/tickets/{ticket_id}/messages',
        headers=manager_headers,
        json={'body': 'Спасибо, попробовал — всё получилось.'},
    )
    assert user_reply.status_code == 200, user_reply.text
    assert user_reply.json()['status'] == 'in_progress'
    assert user_reply.json()['unread_for_staff'] is True
    assert user_reply.json()['unread_for_user'] is False

    closed = client.patch(
        f'/superadmin/api/support/tickets/{ticket_id}',
        headers=staff,
        json={'status': 'closed', 'priority': 'high'},
    )
    assert closed.status_code == 200, closed.text
    assert closed.json()['status'] == 'closed'
    assert closed.json()['priority'] == 'high'

    after_close = client.post(
        f'/api/support/tickets/{ticket_id}/messages',
        headers=manager_headers,
        json={'body': 'Ещё один вопрос после закрытия'},
    )
    assert after_close.status_code == 400, after_close.text


def test_org_admin_has_no_superadmin_inbox(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    r = client.get('/superadmin/api/support/tickets', headers=admin_headers)
    assert r.status_code in (401, 403), r.text


def test_create_ticket_rejects_invalid_category(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    r = client.post(
        '/api/support/tickets',
        headers=manager_headers,
        json={
            'category': 'not_a_real_category',
            'subject': 'Неверная категория',
            'body': 'Тело достаточно длинное для валидации формы.',
            'priority': 'normal',
        },
    )
    assert r.status_code == 400, r.text


def test_create_ticket_rejects_invalid_priority(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    r = client.post(
        '/api/support/tickets',
        headers=manager_headers,
        json={
            'category': 'bug',
            'subject': 'Неверный приоритет',
            'body': 'Тело достаточно длинное для валидации формы.',
            'priority': 'urgent',
        },
    )
    assert r.status_code == 400, r.text


def test_support_meta_returns_russian_labels(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    r = client.get('/api/support/meta', headers=manager_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body['statuses']['new'] == 'Новый'
    assert body['statuses']['waiting_user'] != 'waiting_user'
    assert body['categories']['bug'] != 'bug'
    assert body['priorities']['high'] != 'high'


def test_ticket_attachment_visibility(
    client: httpx.Client,
    manager_headers: dict[str, str],
    admin_headers: dict[str, str],
) -> None:
    r = client.post(
        '/api/support/tickets',
        headers=manager_headers,
        json={
            'category': 'bug',
            'subject': 'Тикет со вложением',
            'body': 'Описание проблемы со скриншотом для теста вложений.',
            'priority': 'normal',
            'attachments': [
                {
                    'file_url': '/uploads/support/pytest-support.png',
                    'filename': 'pytest-support.png',
                }
            ],
        },
    )
    assert r.status_code == 201, r.text
    ticket = r.json()
    ticket_id = ticket['id']
    messages = ticket.get('messages') or []
    assert messages
    assert len(messages[0]['attachments']) == 1
    assert messages[0]['attachments'][0]['file_url'].startswith('/uploads/')

    author_view = client.get(f'/api/support/tickets/{ticket_id}', headers=manager_headers)
    assert author_view.status_code == 200, author_view.text
    assert author_view.json()['messages'][0]['attachments']

    # Manager without support.view_org_tickets cannot open another author's ticket
    # (admin can — covered separately). Create second manager ticket and ensure
    # admin sees attachments via org access.
    admin_view = client.get(f'/api/support/tickets/{ticket_id}', headers=admin_headers)
    assert admin_view.status_code == 200, admin_view.text
    assert admin_view.json()['messages'][0]['attachments'][0]['filename'] == 'pytest-support.png'

    bad = client.post(
        f'/api/support/tickets/{ticket_id}/messages',
        headers=manager_headers,
        json={
            'body': 'Ответ с неверным URL вложения для проверки валидации.',
            'attachments': [{'file_url': 'https://evil.example/x.png', 'filename': 'x.png'}],
        },
    )
    assert bad.status_code == 400, bad.text


def test_org_tickets_requires_action(
    client: httpx.Client,
    manager_headers: dict[str, str],
    admin_headers: dict[str, str],
) -> None:
    ticket = _create_ticket(client, manager_headers, subject='Org inbox visibility')
    ticket_id = ticket['id']

    denied = client.get('/api/support/org-tickets', headers=manager_headers)
    assert denied.status_code == 403, denied.text

    allowed = client.get('/api/support/org-tickets', headers=admin_headers)
    assert allowed.status_code == 200, allowed.text
    assert any(t['id'] == ticket_id for t in allowed.json())


def test_superadmin_reply_templates_crud_and_access(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    staff = _superadmin_headers(client)
    if staff is None:
        pytest.skip('SUPERADMIN_EMAIL/PASSWORD not configured')

    forbidden = client.get('/superadmin/api/support/templates', headers=admin_headers)
    assert forbidden.status_code in (401, 403), forbidden.text

    created = client.post(
        '/superadmin/api/support/templates',
        headers=staff,
        json={
            'category': 'how_to',
            'title': 'Смена роли',
            'body': 'Откройте Настройки → Сотрудники и измените роль.',
        },
    )
    assert created.status_code == 201, created.text
    template = created.json()
    template_id = template['id']
    assert template['title'] == 'Смена роли'

    listed = client.get('/superadmin/api/support/templates', headers=staff)
    assert listed.status_code == 200, listed.text
    assert any(t['id'] == template_id for t in listed.json())

    patched = client.patch(
        f'/superadmin/api/support/templates/{template_id}',
        headers=staff,
        json={'title': 'Смена роли (обновлено)'},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()['title'] == 'Смена роли (обновлено)'

    deleted = client.delete(
        f'/superadmin/api/support/templates/{template_id}',
        headers=staff,
    )
    assert deleted.status_code == 204, deleted.text
