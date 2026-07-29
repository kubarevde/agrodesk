"""Support ticket constants, labels, and shared helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notification import Notification
from app.models.organization import Organization
from app.models.support_ticket import SupportTicket, SupportTicketAttachment, SupportTicketMessage

CATEGORIES: tuple[str, ...] = (
    'bug',
    'access',
    'data',
    'how_to',
    'suggestion',
    'other',
)

CATEGORY_LABELS: dict[str, str] = {
    'bug': 'Ошибка в системе',
    'access': 'Доступы и роли',
    'data': 'Проблемы с данными',
    'how_to': 'Как работать с разделами',
    'suggestion': 'Предложение по улучшению',
    'other': 'Другое',
}

STATUSES: tuple[str, ...] = (
    'new',
    'in_progress',
    'waiting_user',
    'resolved',
    'closed',
)

STATUS_LABELS: dict[str, str] = {
    'new': 'Новый',
    'in_progress': 'В работе',
    'waiting_user': 'Ждёт вашего ответа',
    'resolved': 'Решён',
    'closed': 'Закрыт',
}

PRIORITIES: tuple[str, ...] = ('normal', 'high')

PRIORITY_LABELS: dict[str, str] = {
    'normal': 'Обычный',
    'high': 'Высокий',
}

OPEN_STATUSES = frozenset({'new', 'in_progress', 'waiting_user'})
USER_REPLY_ALLOWED = frozenset({'new', 'in_progress', 'waiting_user', 'resolved'})


def assert_category(value: str) -> str:
    if value not in CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Неизвестная категория')
    return value


def assert_status(value: str) -> str:
    if value not in STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Неизвестный статус')
    return value


def assert_priority(value: str) -> str:
    if value not in PRIORITIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Неизвестный приоритет')
    return value


async def get_ticket_or_404(
    db: AsyncSession,
    ticket_id: UUID,
    *,
    org_id: UUID | None = None,
) -> SupportTicket:
    query = (
        select(SupportTicket)
        .options(
            selectinload(SupportTicket.messages).selectinload(SupportTicketMessage.attachments),
            selectinload(SupportTicket.organization),
            selectinload(SupportTicket.assignee),
        )
        .where(SupportTicket.id == ticket_id)
    )
    if org_id is not None:
        query = query.where(SupportTicket.org_id == org_id)
    ticket = (await db.execute(query)).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Обращение не найдено')
    return ticket


async def get_org_name(db: AsyncSession, org_id: UUID) -> str:
    name = await db.scalar(select(Organization.name).where(Organization.id == org_id))
    return name or 'Организация'


async def notify_author_support_reply(
    db: AsyncSession,
    *,
    ticket: SupportTicket,
) -> None:
    db.add(
        Notification(
            employee_id=ticket.author_id,
            type='support_reply',
            title='Ответ техподдержки',
            body=f'По обращению «{ticket.subject}» есть новый ответ.',
            link=f'/support/{ticket.id}',
            is_read=False,
        )
    )


def touch_ticket(ticket: SupportTicket) -> None:
    ticket.updated_at = datetime.now(timezone.utc)
    ticket.last_message_at = ticket.updated_at


def ticket_to_dict(
    ticket: SupportTicket,
    *,
    org_name: str | None = None,
    include_messages: bool = False,
    last_message_preview: str | None = None,
) -> dict:
    name = org_name
    if name is None and ticket.organization is not None:
        name = ticket.organization.name

    preview = last_message_preview
    if preview is None and ticket.messages:
        last = ticket.messages[-1]
        preview = (last.body or '').strip()
        if len(preview) > 120:
            preview = preview[:117] + '…'

    assignee_email = None
    # Avoid async lazy-load: only use assignee if already eagerly loaded
    loaded_assignee = ticket.__dict__.get('assignee')
    if loaded_assignee is not None:
        assignee_email = loaded_assignee.email

    payload: dict = {
        'id': ticket.id,
        'org_id': ticket.org_id,
        'org_name': name or '',
        'author_id': ticket.author_id,
        'author_role': ticket.author_role,
        'author_name': ticket.author_name,
        'category': ticket.category,
        'subject': ticket.subject,
        'status': ticket.status,
        'priority': ticket.priority,
        'assignee_superadmin_id': ticket.assignee_superadmin_id,
        'assignee_email': assignee_email,
        'unread_for_user': bool(ticket.unread_for_user),
        'unread_for_staff': bool(ticket.unread_for_staff),
        'created_at': ticket.created_at,
        'updated_at': ticket.updated_at,
        'closed_at': ticket.closed_at,
        'last_message_at': ticket.last_message_at,
        'last_message_preview': preview,
    }
    if include_messages:
        payload['messages'] = [
            {
                'id': msg.id,
                'author_type': msg.author_type,
                'author_name': msg.author_name,
                'body': msg.body,
                'created_at': msg.created_at,
                'attachments': [
                    {
                        'id': att.id,
                        'file_url': att.file_url,
                        'filename': att.filename,
                        'created_at': att.created_at,
                    }
                    for att in (msg.attachments or [])
                ],
            }
            for msg in (ticket.messages or [])
        ]
    return payload


def message_to_dict(msg: SupportTicketMessage) -> dict:
    return {
        'id': msg.id,
        'author_type': msg.author_type,
        'author_name': msg.author_name,
        'body': msg.body,
        'created_at': msg.created_at,
    }


async def load_last_message_previews(
    db: AsyncSession,
    ticket_ids: list[UUID],
) -> dict[UUID, str]:
    if not ticket_ids:
        return {}
    result = await db.execute(
        select(SupportTicketMessage)
        .where(SupportTicketMessage.ticket_id.in_(ticket_ids))
        .order_by(SupportTicketMessage.created_at.desc())
    )
    previews: dict[UUID, str] = {}
    for msg in result.scalars().all():
        if msg.ticket_id in previews:
            continue
        text = (msg.body or '').strip()
        if len(text) > 120:
            text = text[:117] + '…'
        previews[msg.ticket_id] = text
    return previews


async def get_ticket_for_author_or_403(
    db: AsyncSession,
    ticket_id: UUID,
    *,
    org_id: UUID,
    author_id: UUID,
) -> SupportTicket:
    """Author-scoped access: missing/other-org → 404; same-org foreign → 403."""
    ticket = (
        await db.execute(
            select(SupportTicket)
            .options(
                selectinload(SupportTicket.messages).selectinload(SupportTicketMessage.attachments),
                selectinload(SupportTicket.organization),
                selectinload(SupportTicket.assignee),
            )
            .where(SupportTicket.id == ticket_id)
        )
    ).scalar_one_or_none()
    if ticket is None or ticket.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Обращение не найдено')
    if ticket.author_id != author_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Нет доступа к обращению')
    return ticket


async def get_ticket_for_org_user(
    db: AsyncSession,
    ticket_id: UUID,
    *,
    org_id: UUID,
    employee_id: UUID,
    can_view_org: bool,
) -> SupportTicket:
    """Author always; org-wide viewers with support.view_org_tickets for same org."""
    ticket = await get_ticket_or_404(db, ticket_id, org_id=org_id)
    if ticket.author_id == employee_id:
        return ticket
    if can_view_org:
        return ticket
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Нет доступа к обращению')


def attach_files_to_message(
    *,
    ticket_id: UUID,
    message_id: UUID,
    attachments: list,
    employee_id: UUID | None = None,
    superadmin_id: UUID | None = None,
) -> list[SupportTicketAttachment]:
    rows: list[SupportTicketAttachment] = []
    for item in attachments:
        file_url = (getattr(item, 'file_url', None) or '').strip()
        filename = (getattr(item, 'filename', None) or '').strip() or 'file'
        if not file_url.startswith('/uploads/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Некорректный URL вложения',
            )
        rows.append(
            SupportTicketAttachment(
                ticket_id=ticket_id,
                message_id=message_id,
                file_url=file_url,
                filename=filename[:255],
                uploaded_by_employee_id=employee_id,
                uploaded_by_superadmin_id=superadmin_id,
            )
        )
    return rows

