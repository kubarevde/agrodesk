"""Internal org messenger API.

Privacy: org admin may see all group chats in the list (moderation), but message
history for any chat — including directs between other employees — requires
active membership. Direct chats of others never appear in an admin's list.

Realtime: GET /events is Server-Sent Events (SSE). Poll remains the client fallback.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, security
from app.middleware.org_context import get_org_id
from app.models.employee import Employee, EmployeeRole
from app.schemas.messenger import (
    ChatDetail,
    ChatListItem,
    ChatMessageCreate,
    ChatMessageOut,
    ChatMessagesPage,
    ChatReadState,
    ChatReadUpdate,
    DirectChatCreate,
    GroupChatCreate,
    GroupChatUpdate,
    MessengerPeerOut,
)
from app.services import messenger as svc
from app.services.audit import log_change
from app.services.auth import ALGORITHM
from app.services.messenger_hub import build_event, hub
from app.services.telegram_notify import format_messenger_telegram_text

router = APIRouter()


async def _employee_from_bearer_or_query(
    *,
    credentials: HTTPAuthorizationCredentials | None,
    token: str | None,
    db: AsyncSession,
) -> Employee:
    """Auth for SSE (EventSource cannot set Authorization header → ?token=)."""
    raw = (credentials.credentials if credentials is not None else None) or (token or '').strip()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    try:
        payload = jwt.decode(raw, settings.SECRET_KEY, algorithms=[ALGORITHM])
        employee_id = payload.get('sub')
        if employee_id is None:
            raise ValueError('missing sub')
        employee_uuid = UUID(str(employee_id))
        token_org_raw = payload.get('org_id')
        token_org_id = UUID(str(token_org_raw)) if token_org_raw is not None else None
    except (JWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
            headers={'WWW-Authenticate': 'Bearer'},
        ) from exc

    employee = await db.scalar(select(Employee).where(Employee.id == employee_uuid))
    if employee is None or not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    if token_org_id is not None and employee.org_id != token_org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    return employee


async def _publish_to_members(
    *,
    org_id: UUID,
    member_ids: list[UUID],
    event: dict,
) -> None:
    if not member_ids:
        return
    await hub.publish(org_id=org_id, employee_ids=member_ids, event=event)


@router.get('/events')
async def messenger_events(
    request: Request,
    token: str | None = Query(None, description='JWT for EventSource clients'),
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> StreamingResponse:
    current = await _employee_from_bearer_or_query(
        credentials=credentials, token=token, db=db
    )
    org_id = current.org_id
    queue = await hub.subscribe(org_id, current.id)

    async def event_stream():
        try:
            hello = build_event('connected', employee_id=str(current.id))
            yield f"event: connected\ndata: {json.dumps(hello)}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    event_type = str(event.get('type') or 'message')
                    yield f"event: {event_type}\ndata: {json.dumps(event, default=str)}\n\n"
                except asyncio.TimeoutError:
                    yield ': keepalive\n\n'
        finally:
            await hub.unsubscribe(org_id, current.id, queue)

    return StreamingResponse(
        event_stream(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


@router.get('/chats', response_model=list[ChatListItem])
async def list_chats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[ChatListItem]:
    org_id = get_org_id(request)
    mine = await svc.list_my_chats(db, org_id=org_id, employee_id=current.id)
    if current.role == EmployeeRole.admin:
        groups = await svc.list_org_group_chats(db, org_id=org_id)
        chats = svc.merge_chats_unique(mine, groups)
    else:
        chats = mine
    return await svc.build_chat_list_items(db, org_id=org_id, viewer=current, chats=chats)


@router.get('/peers', response_model=list[MessengerPeerOut])
async def list_peers(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[MessengerPeerOut]:
    org_id = get_org_id(request)
    peers = await svc.list_messenger_peers(
        db, org_id=org_id, exclude_employee_id=current.id
    )
    return [
        MessengerPeerOut(
            id=peer.id,
            full_name=peer.full_name,
            employee_code=peer.employee_code,
        )
        for peer in peers
    ]


@router.post('/chats/direct', response_model=ChatDetail, status_code=status.HTTP_200_OK)
async def get_or_create_direct_chat(
    payload: DirectChatCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> ChatDetail:
    org_id = get_org_id(request)
    chat = await svc.get_or_create_direct_chat(
        db,
        org_id=org_id,
        current=current,
        peer_employee_id=payload.peer_employee_id,
    )
    chat_id = chat.id
    await db.commit()
    chat = await svc.get_chat_or_404(db, chat_id, org_id)
    member_ids = svc.active_member_ids(chat)
    await _publish_to_members(
        org_id=org_id,
        member_ids=member_ids,
        event=build_event('new_chat', chat_id=str(chat_id), chat_type=chat.type),
    )
    items = await svc.build_chat_list_items(db, org_id=org_id, viewer=current, chats=[chat])
    return ChatDetail(**items[0].model_dump())


@router.post('/chats/group', response_model=ChatDetail, status_code=status.HTTP_201_CREATED)
async def create_group_chat(
    payload: GroupChatCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> ChatDetail:
    org_id = get_org_id(request)
    chat = await svc.create_group_chat(
        db,
        org_id=org_id,
        current=current,
        name=payload.name,
        member_ids=list(payload.member_ids),
    )
    chat_id = chat.id
    member_ids = [str(mid) for mid in svc.active_member_ids(chat)]
    await log_change(
        db,
        org_id=org_id,
        entity_type='chat',
        entity_id=chat_id,
        action='create',
        changed_by=current.id,
        after={'type': 'group', 'name': chat.name, 'member_ids': member_ids},
        summary=f'Создана группа «{chat.name}»',
    )
    await db.commit()
    chat = await svc.get_chat_or_404(db, chat_id, org_id)
    await _publish_to_members(
        org_id=org_id,
        member_ids=svc.active_member_ids(chat),
        event=build_event('new_chat', chat_id=str(chat_id), chat_type='group'),
    )
    items = await svc.build_chat_list_items(db, org_id=org_id, viewer=current, chats=[chat])
    return ChatDetail(**items[0].model_dump())


@router.patch('/chats/{chat_id}', response_model=ChatDetail)
async def update_group_chat(
    chat_id: UUID,
    payload: GroupChatUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> ChatDetail:
    org_id = get_org_id(request)
    chat = await svc.get_chat_or_404(db, chat_id, org_id)
    before = {
        'name': chat.name,
        'member_ids': [str(mid) for mid in svc.active_member_ids(chat)],
    }
    chat = await svc.update_group_chat(
        db,
        chat=chat,
        org_id=org_id,
        name=payload.name,
        add_member_ids=list(payload.add_member_ids),
        remove_member_ids=list(payload.remove_member_ids),
    )
    after = {
        'name': chat.name,
        'member_ids': [str(mid) for mid in svc.active_member_ids(chat)],
        'added': [str(x) for x in payload.add_member_ids],
        'removed': [str(x) for x in payload.remove_member_ids],
    }
    parts: list[str] = []
    if payload.name is not None:
        parts.append(f'название → «{chat.name}»')
    if payload.add_member_ids:
        parts.append(f'добавлено участников: {len(payload.add_member_ids)}')
    if payload.remove_member_ids:
        parts.append(f'удалено участников: {len(payload.remove_member_ids)}')
    summary = 'Обновлена группа' + (f': {"; ".join(parts)}' if parts else '')
    await log_change(
        db,
        org_id=org_id,
        entity_type='chat',
        entity_id=chat_id,
        action='update',
        changed_by=current.id,
        before=before,
        after=after,
        summary=summary,
    )
    await db.commit()
    chat = await svc.get_chat_or_404(db, chat_id, org_id)
    notify_ids = list(
        {
            *svc.active_member_ids(chat),
            *[UUID(str(x)) for x in payload.remove_member_ids],
        }
    )
    await _publish_to_members(
        org_id=org_id,
        member_ids=notify_ids,
        event=build_event('chat_updated', chat_id=str(chat_id)),
    )
    items = await svc.build_chat_list_items(db, org_id=org_id, viewer=current, chats=[chat])
    return ChatDetail(**items[0].model_dump())


@router.get('/chats/{chat_id}/messages', response_model=ChatMessagesPage)
async def list_messages(
    chat_id: UUID,
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(None),
    before_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> ChatMessagesPage:
    org_id = get_org_id(request)
    await svc.get_chat_or_404(db, chat_id, org_id)
    await svc.require_active_member(
        db, chat_id=chat_id, employee_id=current.id, org_id=org_id
    )
    return await svc.list_messages(
        db,
        org_id=org_id,
        chat_id=chat_id,
        viewer_id=current.id,
        limit=limit,
        before=before,
        before_id=before_id,
    )


@router.post(
    '/chats/{chat_id}/messages',
    response_model=ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    chat_id: UUID,
    payload: ChatMessageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> ChatMessageOut:
    org_id = get_org_id(request)
    chat = await svc.get_chat_or_404(db, chat_id, org_id)
    await svc.require_active_member(
        db, chat_id=chat_id, employee_id=current.id, org_id=org_id
    )
    recipient_ids = svc.active_member_ids(chat, exclude=current.id)
    all_member_ids = svc.active_member_ids(chat)
    message = await svc.send_message(
        db,
        org_id=org_id,
        chat=chat,
        sender=current,
        body=payload.body,
        attachment_url=payload.attachment_url,
    )
    await db.commit()

    out = svc.message_out(message, delivery_status='delivered')
    await _publish_to_members(
        org_id=org_id,
        member_ids=all_member_ids,
        event=build_event(
            'new_message',
            chat_id=str(chat_id),
            message_id=str(out.id),
            sender_id=str(out.sender_id),
            body=out.body,
        ),
    )

    notifier = getattr(request.app.state, 'notifier', None)
    if notifier is not None and recipient_ids:
        web_base = settings.cors_origins[0] if settings.cors_origins else None
        text = format_messenger_telegram_text(
            sender_name=current.full_name,
            body=message.body,
            chat_id=chat_id,
            web_base=web_base,
        )
        for employee_id in recipient_ids:
            await notifier.notify_employee(employee_id, text, db)

    return out


@router.post('/chats/{chat_id}/read', response_model=ChatReadState)
async def mark_read(
    chat_id: UUID,
    payload: ChatReadUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> ChatReadState:
    org_id = get_org_id(request)
    chat = await svc.get_chat_or_404(db, chat_id, org_id)
    await svc.require_active_member(
        db, chat_id=chat_id, employee_id=current.id, org_id=org_id
    )
    row = await svc.upsert_read_state(
        db,
        org_id=org_id,
        chat_id=chat_id,
        employee_id=current.id,
        last_read_message_id=payload.last_read_message_id,
    )
    await db.commit()
    await _publish_to_members(
        org_id=org_id,
        member_ids=svc.active_member_ids(chat),
        event=build_event(
            'message_read',
            chat_id=str(chat_id),
            employee_id=str(current.id),
            last_read_message_id=(
                str(payload.last_read_message_id) if payload.last_read_message_id else None
            ),
        ),
    )
    return svc.read_state_out(row)
