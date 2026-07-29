"""Superadmin support inbox API."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.superadmin import require_superadmin
from app.models.organization import SuperAdminUser
from app.models.support_ticket import SupportReplyTemplate, SupportTicket, SupportTicketMessage
from app.schemas.support import (
    SupportReplyTemplateCreate,
    SupportReplyTemplateOut,
    SupportReplyTemplateUpdate,
    SupportTicketDetail,
    SupportTicketListItem,
    SupportTicketMessageCreate,
    SupportTicketUpdate,
    SupportUnreadCount,
)
from app.services.audit import log_change
from app.services.support import (
    assert_category,
    assert_priority,
    assert_status,
    attach_files_to_message,
    get_ticket_or_404,
    load_last_message_previews,
    notify_author_support_reply,
    ticket_to_dict,
    touch_ticket,
)

router = APIRouter(prefix='/support', tags=['superadmin-support'])


@router.get('/unread-count', response_model=SupportUnreadCount)
async def staff_unread_count(
    db: AsyncSession = Depends(get_db),
    _admin: SuperAdminUser = Depends(require_superadmin),
) -> SupportUnreadCount:
    count = await db.scalar(
        select(func.count())
        .select_from(SupportTicket)
        .where(SupportTicket.unread_for_staff.is_(True))
    )
    return SupportUnreadCount(count=int(count or 0))


@router.get('/tickets', response_model=list[SupportTicketListItem])
async def list_all_tickets(
    status_filter: str | None = Query(None, alias='status'),
    org_id: UUID | None = Query(None),
    author_role: str | None = Query(None),
    category: str | None = Query(None),
    priority: str | None = Query(None),
    unread_only: bool = Query(False),
    assigned_to_me: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    admin: SuperAdminUser = Depends(require_superadmin),
) -> list[SupportTicketListItem]:
    query = select(SupportTicket).options(
        selectinload(SupportTicket.organization),
        selectinload(SupportTicket.assignee),
    )
    if status_filter:
        query = query.where(SupportTicket.status == status_filter)
    if org_id is not None:
        query = query.where(SupportTicket.org_id == org_id)
    if author_role:
        query = query.where(SupportTicket.author_role == author_role)
    if category:
        query = query.where(SupportTicket.category == category)
    if priority:
        query = query.where(SupportTicket.priority == priority)
    if unread_only:
        query = query.where(SupportTicket.unread_for_staff.is_(True))
    if assigned_to_me:
        query = query.where(SupportTicket.assignee_superadmin_id == admin.id)
    query = query.order_by(SupportTicket.unread_for_staff.desc(), SupportTicket.updated_at.desc())
    tickets = list((await db.execute(query)).scalars().all())
    previews = await load_last_message_previews(db, [t.id for t in tickets])
    return [
        SupportTicketListItem(
            **ticket_to_dict(
                t,
                org_name=t.organization.name if t.organization else '',
                last_message_preview=previews.get(t.id),
            )
        )
        for t in tickets
    ]


@router.get('/tickets/{ticket_id}', response_model=SupportTicketDetail)
async def get_ticket(
    ticket_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: SuperAdminUser = Depends(require_superadmin),
) -> SupportTicketDetail:
    ticket = await get_ticket_or_404(db, ticket_id)
    changed = False
    if ticket.unread_for_staff:
        ticket.unread_for_staff = False
        changed = True
    if ticket.status == 'new':
        ticket.status = 'in_progress'
        changed = True
    if ticket.assignee_superadmin_id is None:
        ticket.assignee_superadmin_id = admin.id
        changed = True
    if changed:
        await db.commit()
        ticket = await get_ticket_or_404(db, ticket_id)

    return SupportTicketDetail(
        **ticket_to_dict(
            ticket,
            org_name=ticket.organization.name if ticket.organization else '',
            include_messages=True,
        )
    )


@router.post('/tickets/{ticket_id}/messages', response_model=SupportTicketDetail)
async def reply_to_ticket(
    ticket_id: UUID,
    payload: SupportTicketMessageCreate,
    db: AsyncSession = Depends(get_db),
    admin: SuperAdminUser = Depends(require_superadmin),
) -> SupportTicketDetail:
    ticket = await get_ticket_or_404(db, ticket_id)
    if ticket.status == 'closed':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Обращение закрыто')

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Сообщение пустое')

    author_name = (admin.email or 'Поддержка').strip()
    message = SupportTicketMessage(
        ticket_id=ticket.id,
        author_type='superadmin',
        author_superadmin_id=admin.id,
        author_name=author_name,
        body=body,
    )
    db.add(message)
    await db.flush()
    for row in attach_files_to_message(
        ticket_id=ticket.id,
        message_id=message.id,
        attachments=payload.attachments,
        superadmin_id=admin.id,
    ):
        db.add(row)
    touch_ticket(ticket)
    ticket.unread_for_user = True
    ticket.unread_for_staff = False
    if ticket.assignee_superadmin_id is None:
        ticket.assignee_superadmin_id = admin.id
    if ticket.status in {'new', 'in_progress', 'resolved'}:
        ticket.status = 'waiting_user'
        ticket.closed_at = None

    await notify_author_support_reply(db, ticket=ticket)
    await log_change(
        db,
        org_id=ticket.org_id,
        entity_type='support_ticket',
        entity_id=ticket.id,
        action='update',
        changed_by=None,
        after={'staff_reply': True, 'status': ticket.status, 'by': author_name},
        summary='Ответ техподдержки',
    )
    await db.commit()

    ticket = await get_ticket_or_404(db, ticket_id)
    return SupportTicketDetail(
        **ticket_to_dict(
            ticket,
            org_name=ticket.organization.name if ticket.organization else '',
            include_messages=True,
        )
    )


@router.patch('/tickets/{ticket_id}', response_model=SupportTicketDetail)
async def update_ticket(
    ticket_id: UUID,
    payload: SupportTicketUpdate,
    db: AsyncSession = Depends(get_db),
    admin: SuperAdminUser = Depends(require_superadmin),
) -> SupportTicketDetail:
    ticket = await get_ticket_or_404(db, ticket_id)
    before: dict = {
        'status': ticket.status,
        'priority': ticket.priority,
        'assignee_superadmin_id': str(ticket.assignee_superadmin_id)
        if ticket.assignee_superadmin_id
        else None,
    }

    if payload.status is not None:
        new_status = assert_status(payload.status)
        ticket.status = new_status
        if new_status in {'resolved', 'closed'}:
            ticket.closed_at = datetime.now(timezone.utc)
        elif new_status in {'new', 'in_progress', 'waiting_user'}:
            ticket.closed_at = None

    if payload.priority is not None:
        ticket.priority = assert_priority(payload.priority)

    if payload.assign_to_me:
        ticket.assignee_superadmin_id = admin.id
    elif payload.clear_assignee:
        ticket.assignee_superadmin_id = None
    elif payload.assignee_superadmin_id is not None:
        exists = await db.scalar(
            select(SuperAdminUser.id).where(
                SuperAdminUser.id == payload.assignee_superadmin_id,
                SuperAdminUser.is_active.is_(True),
            )
        )
        if exists is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Ответственный не найден',
            )
        ticket.assignee_superadmin_id = payload.assignee_superadmin_id

    touch_ticket(ticket)
    author_name = (admin.email or 'Поддержка').strip()
    await log_change(
        db,
        org_id=ticket.org_id,
        entity_type='support_ticket',
        entity_id=ticket.id,
        action='update',
        changed_by=None,
        before=before,
        after={
            'status': ticket.status,
            'priority': ticket.priority,
            'assignee_superadmin_id': str(ticket.assignee_superadmin_id)
            if ticket.assignee_superadmin_id
            else None,
            'by': author_name,
        },
        summary='Обновление обращения поддержки',
    )
    await db.commit()

    ticket = await get_ticket_or_404(db, ticket_id)
    return SupportTicketDetail(
        **ticket_to_dict(
            ticket,
            org_name=ticket.organization.name if ticket.organization else '',
            include_messages=True,
        )
    )


@router.get('/templates', response_model=list[SupportReplyTemplateOut])
async def list_templates(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: SuperAdminUser = Depends(require_superadmin),
) -> list[SupportReplyTemplateOut]:
    query = select(SupportReplyTemplate).order_by(
        SupportReplyTemplate.category.asc(),
        SupportReplyTemplate.title.asc(),
    )
    if category:
        query = query.where(SupportReplyTemplate.category == assert_category(category))
    rows = list((await db.execute(query)).scalars().all())
    return [SupportReplyTemplateOut.model_validate(row) for row in rows]


@router.post('/templates', response_model=SupportReplyTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: SupportReplyTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _admin: SuperAdminUser = Depends(require_superadmin),
) -> SupportReplyTemplateOut:
    row = SupportReplyTemplate(
        category=assert_category(payload.category),
        title=payload.title.strip(),
        body=payload.body.strip(),
    )
    if not row.title or not row.body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Заполните название и текст')
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return SupportReplyTemplateOut.model_validate(row)


@router.patch('/templates/{template_id}', response_model=SupportReplyTemplateOut)
async def update_template(
    template_id: UUID,
    payload: SupportReplyTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: SuperAdminUser = Depends(require_superadmin),
) -> SupportReplyTemplateOut:
    row = (
        await db.execute(select(SupportReplyTemplate).where(SupportReplyTemplate.id == template_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Шаблон не найден')
    if payload.category is not None:
        row.category = assert_category(payload.category)
    if payload.title is not None:
        row.title = payload.title.strip()
    if payload.body is not None:
        row.body = payload.body.strip()
    await db.commit()
    await db.refresh(row)
    return SupportReplyTemplateOut.model_validate(row)


@router.delete(
    '/templates/{template_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: SuperAdminUser = Depends(require_superadmin),
) -> Response:
    row = (
        await db.execute(select(SupportReplyTemplate).where(SupportReplyTemplate.id == template_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Шаблон не найден')
    await db.delete(row)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
