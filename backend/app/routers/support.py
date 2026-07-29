"""Org-user support tickets API."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.models.employee import Employee
from app.models.support_ticket import SupportTicket, SupportTicketMessage
from app.schemas.support import (
    SupportTicketCreate,
    SupportTicketDetail,
    SupportTicketListItem,
    SupportTicketMessageCreate,
    SupportUnreadCount,
)
from app.services.action_permissions import (
    employee_has_action,
    require_action,
    resolve_effective_permissions,
)
from app.services.audit import log_change
from app.services.support import (
    USER_REPLY_ALLOWED,
    assert_category,
    assert_priority,
    attach_files_to_message,
    get_org_name,
    get_ticket_for_author_or_403,
    get_ticket_for_org_user,
    load_last_message_previews,
    ticket_to_dict,
    touch_ticket,
)

router = APIRouter()


@router.get('/meta')
async def support_meta(
    _current: Employee = Depends(get_current_employee),
) -> dict:
    from app.services.support import CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS

    return {
        'categories': CATEGORY_LABELS,
        'statuses': STATUS_LABELS,
        'priorities': PRIORITY_LABELS,
    }


@router.get('/unread-count', response_model=SupportUnreadCount)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SupportUnreadCount:
    count = await db.scalar(
        select(func.count())
        .select_from(SupportTicket)
        .where(
            SupportTicket.org_id == current.org_id,
            SupportTicket.author_id == current.id,
            SupportTicket.unread_for_user.is_(True),
        )
    )
    return SupportUnreadCount(count=int(count or 0))


@router.get('/tickets', response_model=list[SupportTicketListItem])
async def list_my_tickets(
    status_filter: str | None = Query(None, alias='status'),
    sort: str = Query('updated'),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[SupportTicketListItem]:
    if sort not in {'updated', 'status'}:
        sort = 'updated'

    query = select(SupportTicket).where(
        SupportTicket.org_id == current.org_id,
        SupportTicket.author_id == current.id,
    )
    if status_filter:
        query = query.where(SupportTicket.status == status_filter)
    if sort == 'status':
        query = query.order_by(SupportTicket.status.asc(), SupportTicket.updated_at.desc())
    else:
        query = query.order_by(SupportTicket.updated_at.desc())

    tickets = list((await db.execute(query)).scalars().all())
    org_name = await get_org_name(db, current.org_id)
    previews = await load_last_message_previews(db, [t.id for t in tickets])
    return [
        SupportTicketListItem(
            **ticket_to_dict(
                t,
                org_name=org_name,
                last_message_preview=previews.get(t.id),
            )
        )
        for t in tickets
    ]


@router.get('/org-tickets', response_model=list[SupportTicketListItem])
async def list_org_tickets(
    status_filter: str | None = Query(None, alias='status'),
    sort: str = Query('updated'),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('support.view_org_tickets')),
) -> list[SupportTicketListItem]:
    if sort not in {'updated', 'status'}:
        sort = 'updated'

    query = select(SupportTicket).where(SupportTicket.org_id == current.org_id)
    if status_filter:
        query = query.where(SupportTicket.status == status_filter)
    if sort == 'status':
        query = query.order_by(SupportTicket.status.asc(), SupportTicket.updated_at.desc())
    else:
        query = query.order_by(SupportTicket.updated_at.desc())

    tickets = list((await db.execute(query)).scalars().all())
    org_name = await get_org_name(db, current.org_id)
    previews = await load_last_message_previews(db, [t.id for t in tickets])
    return [
        SupportTicketListItem(
            **ticket_to_dict(
                t,
                org_name=org_name,
                last_message_preview=previews.get(t.id),
            )
        )
        for t in tickets
    ]


@router.post('/tickets', response_model=SupportTicketDetail, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: SupportTicketCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SupportTicketDetail:
    category = assert_category(payload.category)
    priority = assert_priority(payload.priority)
    subject = payload.subject.strip()
    body = payload.body.strip()
    if len(subject) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Тема слишком короткая')
    if len(body) < 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Опишите проблему подробнее')

    author_name = (current.full_name or 'Сотрудник').strip()
    role_value = current.role.value if hasattr(current.role, 'value') else str(current.role)
    ticket = SupportTicket(
        org_id=current.org_id,
        author_id=current.id,
        author_role=role_value,
        author_name=author_name,
        category=category,
        subject=subject,
        status='new',
        priority=priority,
        unread_for_user=False,
        unread_for_staff=True,
    )
    touch_ticket(ticket)
    db.add(ticket)
    await db.flush()

    message = SupportTicketMessage(
        ticket_id=ticket.id,
        author_type='employee',
        author_employee_id=current.id,
        author_name=author_name,
        body=body,
    )
    db.add(message)
    await db.flush()
    for row in attach_files_to_message(
        ticket_id=ticket.id,
        message_id=message.id,
        attachments=payload.attachments,
        employee_id=current.id,
    ):
        db.add(row)
    ticket.last_message_at = ticket.updated_at

    await log_change(
        db,
        org_id=current.org_id,
        entity_type='support_ticket',
        entity_id=ticket.id,
        action='create',
        changed_by=current.id,
        after={'subject': subject, 'category': category, 'status': 'new', 'priority': priority},
        summary=f'Создано обращение: {subject}',
    )
    await db.commit()

    ticket = await get_ticket_for_author_or_403(
        db, ticket.id, org_id=current.org_id, author_id=current.id
    )
    org_name = await get_org_name(db, current.org_id)
    return SupportTicketDetail(**ticket_to_dict(ticket, org_name=org_name, include_messages=True))


@router.get('/tickets/{ticket_id}', response_model=SupportTicketDetail)
async def get_ticket(
    ticket_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SupportTicketDetail:
    effective = await resolve_effective_permissions(db, current)
    can_view_org = employee_has_action(effective, 'support.view_org_tickets')
    ticket = await get_ticket_for_org_user(
        db,
        ticket_id,
        org_id=current.org_id,
        employee_id=current.id,
        can_view_org=can_view_org,
    )

    if ticket.author_id == current.id and ticket.unread_for_user:
        ticket.unread_for_user = False
        await db.commit()
        ticket = await get_ticket_for_org_user(
            db,
            ticket_id,
            org_id=current.org_id,
            employee_id=current.id,
            can_view_org=can_view_org,
        )

    org_name = await get_org_name(db, current.org_id)
    return SupportTicketDetail(**ticket_to_dict(ticket, org_name=org_name, include_messages=True))


@router.post('/tickets/{ticket_id}/messages', response_model=SupportTicketDetail)
async def reply_to_ticket(
    ticket_id: UUID,
    payload: SupportTicketMessageCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SupportTicketDetail:
    ticket = await get_ticket_for_author_or_403(
        db, ticket_id, org_id=current.org_id, author_id=current.id
    )
    if ticket.status == 'closed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Обращение закрыто. Создайте новое, если вопрос снова актуален.',
        )
    if ticket.status not in USER_REPLY_ALLOWED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Нельзя ответить в этом статусе',
        )

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Сообщение пустое')

    author_name = (current.full_name or 'Сотрудник').strip()
    message = SupportTicketMessage(
        ticket_id=ticket.id,
        author_type='employee',
        author_employee_id=current.id,
        author_name=author_name,
        body=body,
    )
    db.add(message)
    await db.flush()
    for row in attach_files_to_message(
        ticket_id=ticket.id,
        message_id=message.id,
        attachments=payload.attachments,
        employee_id=current.id,
    ):
        db.add(row)
    touch_ticket(ticket)
    ticket.unread_for_staff = True
    ticket.unread_for_user = False
    if ticket.status in {'waiting_user', 'resolved'}:
        ticket.status = 'in_progress'
        ticket.closed_at = None

    await log_change(
        db,
        org_id=current.org_id,
        entity_type='support_ticket',
        entity_id=ticket.id,
        action='update',
        changed_by=current.id,
        after={'reply': True, 'status': ticket.status},
        summary='Ответ пользователя в обращении',
    )
    await db.commit()

    ticket = await get_ticket_for_author_or_403(
        db, ticket_id, org_id=current.org_id, author_id=current.id
    )
    org_name = await get_org_name(db, current.org_id)
    return SupportTicketDetail(**ticket_to_dict(ticket, org_name=org_name, include_messages=True))
