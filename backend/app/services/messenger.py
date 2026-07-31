"""Business logic for org-scoped messenger.

Privacy (fixed): org admin may list all *group* chats for moderation, but never
gains automatic access to *direct* chats between other employees — message history
and unread for DMs always require active membership (same idea as org-wide
support inbox not being open to org admin by default).
Messenger unread source of truth is chat_message_reads; Notification rows are a
separate bell/inbox channel and do not replace chat read state.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import Chat, ChatMember, ChatMemberRole, ChatMessage, ChatMessageRead, ChatType
from app.models.employee import Employee
from app.models.notification import Notification
from app.schemas.messenger import (
    ChatListItem,
    ChatMemberOut,
    ChatMessageOut,
    ChatMessagePreview,
    ChatMessagesPage,
    ChatReadState,
)

# Inbox notification type for new chat messages (bell); chat unread stays in chat_message_reads.
NEW_MESSAGE_NOTIFICATION_TYPE = 'new_message'


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def get_employee_in_org_or_400(
    db: AsyncSession,
    employee_id: UUID,
    org_id: UUID,
) -> Employee:
    employee = await db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.org_id == org_id,
            Employee.is_active.is_(True),
        )
    )
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сотрудник не найден в организации',
        )
    return employee


async def get_chat_or_404(db: AsyncSession, chat_id: UUID, org_id: UUID) -> Chat:
    chat = await db.scalar(
        select(Chat)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Chat.members).selectinload(ChatMember.employee),
        )
        .where(Chat.id == chat_id, Chat.org_id == org_id)
    )
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Чат не найден')
    return chat


async def get_active_membership(
    db: AsyncSession,
    *,
    chat_id: UUID,
    employee_id: UUID,
    org_id: UUID,
) -> ChatMember | None:
    return await db.scalar(
        select(ChatMember).where(
            ChatMember.chat_id == chat_id,
            ChatMember.employee_id == employee_id,
            ChatMember.org_id == org_id,
            ChatMember.left_at.is_(None),
        )
    )


async def require_active_member(
    db: AsyncSession,
    *,
    chat_id: UUID,
    employee_id: UUID,
    org_id: UUID,
) -> ChatMember:
    member = await get_active_membership(
        db, chat_id=chat_id, employee_id=employee_id, org_id=org_id
    )
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Нет доступа к чату',
        )
    return member


async def find_direct_chat(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee_a: UUID,
    employee_b: UUID,
) -> Chat | None:
    chat_id = await db.scalar(
        select(Chat.id)
        .join(ChatMember, ChatMember.chat_id == Chat.id)
        .where(
            Chat.org_id == org_id,
            Chat.type == ChatType.direct.value,
            ChatMember.left_at.is_(None),
            ChatMember.employee_id.in_((employee_a, employee_b)),
        )
        .group_by(Chat.id)
        .having(func.count(func.distinct(ChatMember.employee_id)) == 2)
        .limit(1)
    )
    if chat_id is None:
        return None
    return await get_chat_or_404(db, chat_id, org_id)


async def get_or_create_direct_chat(
    db: AsyncSession,
    *,
    org_id: UUID,
    current: Employee,
    peer_employee_id: UUID,
) -> Chat:
    if peer_employee_id == current.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Нельзя создать личный чат с самим собой',
        )
    peer = await get_employee_in_org_or_400(db, peer_employee_id, org_id)

    existing = await find_direct_chat(
        db, org_id=org_id, employee_a=current.id, employee_b=peer.id
    )
    if existing is not None:
        return existing

    chat = Chat(
        org_id=org_id,
        type=ChatType.direct.value,
        name=None,
        created_by=current.id,
    )
    db.add(chat)
    await db.flush()

    db.add(
        ChatMember(
            org_id=org_id,
            chat_id=chat.id,
            employee_id=current.id,
            role=ChatMemberRole.owner.value,
        )
    )
    db.add(
        ChatMember(
            org_id=org_id,
            chat_id=chat.id,
            employee_id=peer.id,
            role=ChatMemberRole.member.value,
        )
    )
    await db.flush()
    return await get_chat_or_404(db, chat.id, org_id)


async def create_group_chat(
    db: AsyncSession,
    *,
    org_id: UUID,
    current: Employee,
    name: str,
    member_ids: list[UUID],
) -> Chat:
    title = name.strip()
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Укажите название группы')

    unique_ids = []
    seen: set[UUID] = set()
    for emp_id in member_ids:
        if emp_id == current.id or emp_id in seen:
            continue
        seen.add(emp_id)
        unique_ids.append(emp_id)

    for emp_id in unique_ids:
        await get_employee_in_org_or_400(db, emp_id, org_id)

    chat = Chat(
        org_id=org_id,
        type=ChatType.group.value,
        name=title,
        created_by=current.id,
    )
    db.add(chat)
    await db.flush()

    db.add(
        ChatMember(
            org_id=org_id,
            chat_id=chat.id,
            employee_id=current.id,
            role=ChatMemberRole.owner.value,
        )
    )
    for emp_id in unique_ids:
        db.add(
            ChatMember(
                org_id=org_id,
                chat_id=chat.id,
                employee_id=emp_id,
                role=ChatMemberRole.member.value,
            )
        )
    await db.flush()
    return await get_chat_or_404(db, chat.id, org_id)


async def update_group_chat(
    db: AsyncSession,
    *,
    chat: Chat,
    org_id: UUID,
    name: str | None,
    add_member_ids: list[UUID],
    remove_member_ids: list[UUID],
) -> Chat:
    if chat.type != ChatType.group.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Состав и название можно менять только у группового чата',
        )

    if name is not None:
        title = name.strip()
        if not title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Укажите название группы',
            )
        chat.name = title

    for emp_id in add_member_ids:
        await get_employee_in_org_or_400(db, emp_id, org_id)
        existing = await db.scalar(
            select(ChatMember).where(
                ChatMember.chat_id == chat.id,
                ChatMember.employee_id == emp_id,
                ChatMember.org_id == org_id,
            )
        )
        if existing is None:
            db.add(
                ChatMember(
                    org_id=org_id,
                    chat_id=chat.id,
                    employee_id=emp_id,
                    role=ChatMemberRole.member.value,
                )
            )
        elif existing.left_at is not None:
            existing.left_at = None
            existing.joined_at = _now()
            existing.role = ChatMemberRole.member.value
            db.add(existing)

    for emp_id in remove_member_ids:
        membership = await get_active_membership(
            db, chat_id=chat.id, employee_id=emp_id, org_id=org_id
        )
        if membership is None:
            continue
        if membership.role == ChatMemberRole.owner.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Нельзя удалить владельца группы',
            )
        membership.left_at = _now()
        db.add(membership)

    chat.updated_at = _now()
    db.add(chat)
    await db.flush()
    return await get_chat_or_404(db, chat.id, org_id)


async def list_messenger_peers(
    db: AsyncSession,
    *,
    org_id: UUID,
    exclude_employee_id: UUID,
) -> list[Employee]:
    """Active colleagues in the same org for starting chats (no manager grant required)."""
    result = await db.execute(
        select(Employee)
        .where(
            Employee.org_id == org_id,
            Employee.is_active.is_(True),
            Employee.id != exclude_employee_id,
        )
        .order_by(Employee.full_name)
    )
    return list(result.scalars().all())


async def list_my_chats(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee_id: UUID,
) -> list[Chat]:
    result = await db.execute(
        select(Chat)
        .join(ChatMember, ChatMember.chat_id == Chat.id)
        .options(selectinload(Chat.members).selectinload(ChatMember.employee))
        .where(
            Chat.org_id == org_id,
            ChatMember.org_id == org_id,
            ChatMember.employee_id == employee_id,
            ChatMember.left_at.is_(None),
            Chat.archived_at.is_(None),
        )
        .order_by(Chat.updated_at.desc())
    )
    return list(result.scalars().unique().all())


async def list_org_group_chats(
    db: AsyncSession,
    *,
    org_id: UUID,
) -> list[Chat]:
    """All non-archived group chats in the org (admin moderation list). Never includes directs."""
    result = await db.execute(
        select(Chat)
        .options(selectinload(Chat.members).selectinload(ChatMember.employee))
        .where(
            Chat.org_id == org_id,
            Chat.type == ChatType.group.value,
            Chat.archived_at.is_(None),
        )
        .order_by(Chat.updated_at.desc())
    )
    return list(result.scalars().unique().all())


def merge_chats_unique(*groups: list[Chat]) -> list[Chat]:
    """Merge chat lists by id; first occurrence wins (keeps caller ordering preference)."""
    seen: set[UUID] = set()
    merged: list[Chat] = []
    for group in groups:
        for chat in group:
            if chat.id in seen:
                continue
            seen.add(chat.id)
            merged.append(chat)
    merged.sort(key=lambda c: c.updated_at or c.created_at, reverse=True)
    return merged


def active_member_ids(chat: Chat, *, exclude: UUID | None = None) -> list[UUID]:
    ids: list[UUID] = []
    for member in chat.members:
        if member.left_at is not None:
            continue
        if exclude is not None and member.employee_id == exclude:
            continue
        ids.append(member.employee_id)
    return ids


async def create_new_message_notifications(
    db: AsyncSession,
    *,
    chat: Chat,
    sender: Employee,
    message: ChatMessage,
) -> list[UUID]:
    """Insert inbox notifications for other active members. Returns recipient employee ids.

    Does not mark chat as read — unread for messenger UI uses chat_message_reads only.
    """
    preview = (message.body or '').strip()
    if len(preview) > 120:
        preview = f'{preview[:117]}…'
    title = 'Новое сообщение'
    chat_label = chat.name if chat.type == ChatType.group.value and chat.name else 'чат'
    body = f'{sender.full_name}: {preview}' if preview else f'{sender.full_name} в «{chat_label}»'
    link = f'/messenger/{chat.id}'
    recipient_ids = active_member_ids(chat, exclude=sender.id)
    for employee_id in recipient_ids:
        db.add(
            Notification(
                employee_id=employee_id,
                type=NEW_MESSAGE_NOTIFICATION_TYPE,
                title=title,
                body=body,
                link=link,
                is_read=False,
            )
        )
    if recipient_ids:
        await db.flush()
    return recipient_ids


async def load_last_messages(
    db: AsyncSession,
    chat_ids: list[UUID],
) -> dict[UUID, ChatMessage]:
    if not chat_ids:
        return {}
    ranked = (
        select(
            ChatMessage.id.label('mid'),
            func.row_number()
            .over(
                partition_by=ChatMessage.chat_id,
                order_by=(ChatMessage.created_at.desc(), ChatMessage.id.desc()),
            )
            .label('rn'),
        )
        .where(
            ChatMessage.chat_id.in_(chat_ids),
            ChatMessage.deleted_at.is_(None),
        )
        .subquery()
    )
    result = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender))
        .join(ranked, ChatMessage.id == ranked.c.mid)
        .where(ranked.c.rn == 1)
    )
    messages = list(result.scalars().all())
    return {m.chat_id: m for m in messages}


async def load_unread_counts(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee_id: UUID,
    chat_ids: list[UUID],
) -> dict[UUID, int]:
    if not chat_ids:
        return {}

    reads = {
        row.chat_id: row
        for row in (
            await db.execute(
                select(ChatMessageRead).where(
                    ChatMessageRead.org_id == org_id,
                    ChatMessageRead.employee_id == employee_id,
                    ChatMessageRead.chat_id.in_(chat_ids),
                )
            )
        ).scalars().all()
    }

    last_read_ids = [
        row.last_read_message_id
        for row in reads.values()
        if row.last_read_message_id is not None
    ]
    last_read_times: dict[UUID, datetime] = {}
    if last_read_ids:
        for msg in (
            await db.execute(select(ChatMessage).where(ChatMessage.id.in_(last_read_ids)))
        ).scalars().all():
            last_read_times[msg.id] = msg.created_at

    counts: dict[UUID, int] = {cid: 0 for cid in chat_ids}
    for chat_id in chat_ids:
        read = reads.get(chat_id)
        filters = [
            ChatMessage.org_id == org_id,
            ChatMessage.chat_id == chat_id,
            ChatMessage.deleted_at.is_(None),
            ChatMessage.sender_id != employee_id,
        ]
        if read is not None and read.last_read_message_id is not None:
            cutoff = last_read_times.get(read.last_read_message_id)
            if cutoff is not None:
                filters.append(
                    or_(
                        ChatMessage.created_at > cutoff,
                        and_(
                            ChatMessage.created_at == cutoff,
                            ChatMessage.id > read.last_read_message_id,
                        ),
                    )
                )
        count = await db.scalar(select(func.count()).select_from(ChatMessage).where(*filters))
        counts[chat_id] = int(count or 0)
    return counts


def chat_title(chat: Chat, viewer_id: UUID) -> str:
    if chat.type == ChatType.group.value:
        return (chat.name or 'Группа').strip() or 'Группа'
    peers = [
        m
        for m in chat.members
        if m.left_at is None and m.employee_id != viewer_id and m.employee is not None
    ]
    if peers:
        return peers[0].employee.full_name
    return 'Личный чат'


def active_members_out(chat: Chat) -> list[ChatMemberOut]:
    items: list[ChatMemberOut] = []
    for member in chat.members:
        if member.left_at is not None or member.employee is None:
            continue
        items.append(
            ChatMemberOut(
                employee_id=member.employee_id,
                full_name=member.employee.full_name,
                role=member.role,
                joined_at=member.joined_at,
            )
        )
    items.sort(key=lambda m: m.full_name.lower())
    return items


def message_preview(message: ChatMessage) -> ChatMessagePreview:
    sender_name = message.sender.full_name if message.sender is not None else 'Сотрудник'
    body = (message.body or '').strip()
    if len(body) > 160:
        body = body[:157] + '…'
    return ChatMessagePreview(
        id=message.id,
        body=body,
        sender_id=message.sender_id,
        sender_name=sender_name,
        created_at=message.created_at,
        attachment_url=message.attachment_url,
    )


def message_out(
    message: ChatMessage,
    *,
    delivery_status: str = 'delivered',
) -> ChatMessageOut:
    sender_name = message.sender.full_name if message.sender is not None else 'Сотрудник'
    body = message.body
    if message.deleted_at is not None:
        body = ''
    return ChatMessageOut(
        id=message.id,
        chat_id=message.chat_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        body=body,
        attachment_url=None if message.deleted_at else message.attachment_url,
        created_at=message.created_at,
        edited_at=message.edited_at,
        deleted_at=message.deleted_at,
        delivery_status=delivery_status,
    )


def _message_order_key(message: ChatMessage) -> tuple[datetime, UUID]:
    return (message.created_at, message.id)


def message_covered_by_watermark(message: ChatMessage, watermark: ChatMessage) -> bool:
    """True when watermark is at or after message in chat chronology."""
    return _message_order_key(watermark) >= _message_order_key(message)


async def load_peer_read_watermarks(
    db: AsyncSession,
    *,
    chat_id: UUID,
    exclude_employee_id: UUID,
) -> list[ChatMessage]:
    """Last-read messages of other members (for outgoing delivery_status=read)."""
    read_rows = list(
        (
            await db.execute(
                select(ChatMessageRead).where(
                    ChatMessageRead.chat_id == chat_id,
                    ChatMessageRead.employee_id != exclude_employee_id,
                    ChatMessageRead.last_read_message_id.is_not(None),
                )
            )
        )
        .scalars()
        .all()
    )
    msg_ids = [row.last_read_message_id for row in read_rows if row.last_read_message_id]
    if not msg_ids:
        return []
    return list(
        (await db.execute(select(ChatMessage).where(ChatMessage.id.in_(msg_ids)))).scalars().all()
    )


def delivery_status_for_viewer(
    message: ChatMessage,
    *,
    viewer_id: UUID,
    peer_watermarks: list[ChatMessage],
) -> str:
    """Outgoing: delivered until any other member's read watermark covers it."""
    if message.sender_id != viewer_id:
        return 'delivered'
    if any(message_covered_by_watermark(message, mark) for mark in peer_watermarks):
        return 'read'
    return 'delivered'


async def build_chat_list_items(
    db: AsyncSession,
    *,
    org_id: UUID,
    viewer: Employee,
    chats: list[Chat],
) -> list[ChatListItem]:
    chat_ids = [c.id for c in chats]
    last_by_chat = await load_last_messages(db, chat_ids)
    unread = await load_unread_counts(
        db, org_id=org_id, employee_id=viewer.id, chat_ids=chat_ids
    )
    items: list[ChatListItem] = []
    for chat in chats:
        last = last_by_chat.get(chat.id)
        items.append(
            ChatListItem(
                id=chat.id,
                type=chat.type,
                name=chat.name,
                title=chat_title(chat, viewer.id),
                created_by=chat.created_by,
                created_at=chat.created_at,
                updated_at=chat.updated_at,
                archived_at=chat.archived_at,
                members=active_members_out(chat),
                last_message=message_preview(last) if last else None,
                unread_count=unread.get(chat.id, 0),
            )
        )
    return items


async def list_messages(
    db: AsyncSession,
    *,
    org_id: UUID,
    chat_id: UUID,
    viewer_id: UUID,
    limit: int,
    before: datetime | None,
    before_id: UUID | None,
) -> ChatMessagesPage:
    query = (
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender))
        .where(
            ChatMessage.org_id == org_id,
            ChatMessage.chat_id == chat_id,
        )
    )
    if before is not None:
        if before_id is not None:
            query = query.where(
                or_(
                    ChatMessage.created_at < before,
                    and_(ChatMessage.created_at == before, ChatMessage.id < before_id),
                )
            )
        else:
            query = query.where(ChatMessage.created_at < before)

    query = query.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc()).limit(limit + 1)
    rows = list((await db.execute(query)).scalars().all())
    has_more = len(rows) > limit
    page = rows[:limit]
    next_before = None
    next_before_id = None
    if has_more and page:
        oldest = page[-1]
        next_before = oldest.created_at
        next_before_id = oldest.id

    peer_watermarks = await load_peer_read_watermarks(
        db, chat_id=chat_id, exclude_employee_id=viewer_id
    )
    return ChatMessagesPage(
        items=[
            message_out(
                m,
                delivery_status=delivery_status_for_viewer(
                    m, viewer_id=viewer_id, peer_watermarks=peer_watermarks
                ),
            )
            for m in page
        ],
        next_before=next_before,
        next_before_id=next_before_id,
    )


async def send_message(
    db: AsyncSession,
    *,
    org_id: UUID,
    chat: Chat,
    sender: Employee,
    body: str,
    attachment_url: str | None,
) -> ChatMessage:
    text = body.strip()
    if not text and not attachment_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сообщение не может быть пустым',
        )
    message = ChatMessage(
        org_id=org_id,
        chat_id=chat.id,
        sender_id=sender.id,
        body=text or (attachment_url or ''),
        attachment_url=attachment_url,
    )
    db.add(message)
    chat.updated_at = _now()
    db.add(chat)
    await db.flush()

    # Auto-mark as read for sender (messenger unread SoT: chat_message_reads)
    await upsert_read_state(
        db,
        org_id=org_id,
        chat_id=chat.id,
        employee_id=sender.id,
        last_read_message_id=message.id,
    )
    await db.flush()

    loaded = await db.scalar(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender))
        .where(ChatMessage.id == message.id)
    )
    if loaded is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Не удалось сохранить сообщение',
        )

    await create_new_message_notifications(db, chat=chat, sender=sender, message=loaded)
    return loaded


async def upsert_read_state(
    db: AsyncSession,
    *,
    org_id: UUID,
    chat_id: UUID,
    employee_id: UUID,
    last_read_message_id: UUID | None,
) -> ChatMessageRead:
    if last_read_message_id is not None:
        msg = await db.scalar(
            select(ChatMessage).where(
                ChatMessage.id == last_read_message_id,
                ChatMessage.chat_id == chat_id,
                ChatMessage.org_id == org_id,
            )
        )
        if msg is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Сообщение не найдено в этом чате',
            )

    row = await db.scalar(
        select(ChatMessageRead).where(
            ChatMessageRead.chat_id == chat_id,
            ChatMessageRead.employee_id == employee_id,
        )
    )
    if row is None:
        row = ChatMessageRead(
            chat_id=chat_id,
            employee_id=employee_id,
            org_id=org_id,
            last_read_message_id=last_read_message_id,
            updated_at=_now(),
        )
    else:
        # Only move forward
        if last_read_message_id is not None and row.last_read_message_id is not None:
            current_msg = await db.scalar(
                select(ChatMessage).where(ChatMessage.id == row.last_read_message_id)
            )
            new_msg = await db.scalar(
                select(ChatMessage).where(ChatMessage.id == last_read_message_id)
            )
            if (
                current_msg is not None
                and new_msg is not None
                and (
                    new_msg.created_at < current_msg.created_at
                    or (
                        new_msg.created_at == current_msg.created_at
                        and new_msg.id < current_msg.id
                    )
                )
            ):
                return row
        row.last_read_message_id = last_read_message_id
        row.updated_at = _now()
        row.org_id = org_id
    db.add(row)
    await db.flush()
    return row


def read_state_out(row: ChatMessageRead) -> ChatReadState:
    return ChatReadState(
        chat_id=row.chat_id,
        employee_id=row.employee_id,
        last_read_message_id=row.last_read_message_id,
        updated_at=row.updated_at,
    )
