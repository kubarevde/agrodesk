from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.models.employee import Employee
from app.models.notification import Notification
from app.schemas.notification import NotificationCountResponse, NotificationResponse

router = APIRouter()


def notification_to_response(item: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=item.id,
        type=item.type,
        title=item.title,
        body=item.body,
        link=item.link,
        is_read=bool(item.is_read),
        created_at=item.created_at,
    )


async def get_notification_or_404(
    db: AsyncSession,
    notification_id: UUID,
    employee_id: UUID,
) -> Notification:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.employee_id == employee_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Уведомление не найдено',
        )
    return item


@router.get('', response_model=list[NotificationResponse])
async def list_notifications(
    is_read: bool | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[NotificationResponse]:
    query = select(Notification).where(Notification.employee_id == current.id)

    if is_read is not None:
        query = query.where(Notification.is_read.is_(is_read))

    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return [notification_to_response(item) for item in result.scalars().all()]


@router.get('/count', response_model=NotificationCountResponse)
async def count_notifications(
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> NotificationCountResponse:
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.employee_id == current.id,
            Notification.is_read.is_(False),
        )
    )
    unread = int(result.scalar_one() or 0)
    return NotificationCountResponse(unread=unread)


@router.patch('/read-all', status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> None:
    await db.execute(
        update(Notification)
        .where(
            Notification.employee_id == current.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()


@router.patch('/{notification_id}/read', response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> NotificationResponse:
    item = await get_notification_or_404(db, notification_id, current.id)
    item.is_read = True
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return notification_to_response(item)
