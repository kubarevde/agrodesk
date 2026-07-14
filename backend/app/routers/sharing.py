from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.models.employee import Employee, EmployeeRole
from app.models.implement import Implement
from app.models.notification import Notification
from app.models.reference import Equipment, Location
from app.models.sharing import SharingListing, SharingRequest
from app.schemas.sharing import (
    SharingListingCreate,
    SharingListingResponse,
    SharingListingStatusUpdate,
    SharingListingUpdate,
    SharingRequestCreate,
    SharingRequestResponse,
    SharingRequestStatusUpdate,
)

router = APIRouter()


def _num(value: Decimal | float | None) -> float | None:
    if value is None:
        return None
    return float(value)


def build_image_urls(images: list[str] | None) -> list[str]:
    if not images:
        return []
    base = settings.api_url
    result: list[str] = []
    for path in images:
        if path.startswith('http://') or path.startswith('https://'):
            result.append(path)
            continue
        normalized = path if path.startswith('/') else f'/{path}'
        result.append(f'{base}{normalized}')
    return result


def listing_load_options():
    return (
        selectinload(SharingListing.owner),
        selectinload(SharingListing.location),
        selectinload(SharingListing.equipment),
        selectinload(SharingListing.implement),
        selectinload(SharingListing.requests),
    )


def request_load_options():
    return (
        selectinload(SharingRequest.requester),
        selectinload(SharingRequest.listing).selectinload(SharingListing.owner),
    )


def normalize_image_paths(images: list[str] | None) -> list[str]:
    if not images:
        return []
    base = settings.api_url
    result: list[str] = []
    for raw in images:
        path = raw.strip()
        if path.startswith(base):
            path = path[len(base) :]
        if not path.startswith('/'):
            path = f'/{path}'
        result.append(path)
    return result


def is_owner_or_admin(listing: SharingListing, employee: Employee) -> bool:
    return listing.owner_id == employee.id or employee.role == EmployeeRole.admin


def listing_to_response(listing: SharingListing) -> SharingListingResponse:
    raw_images = listing.images if isinstance(listing.images, list) else []
    image_paths = [str(item) for item in raw_images]

    return SharingListingResponse(
        id=listing.id,
        type=listing.type,
        title=listing.title,
        description=listing.description,
        price_per_unit=_num(listing.price_per_unit),
        price_unit=listing.price_unit,
        field_id=listing.location_id,
        equipment_id=listing.equipment_id,
        implement_id=listing.implement_id,
        region=listing.region,
        contact_info=listing.contact_info,
        lat=_num(listing.latitude),
        lng=_num(listing.longitude),
        status=listing.status,
        owner_id=listing.owner_id,
        owner_name=listing.owner.full_name if listing.owner else '',
        field_name=listing.location.name if listing.location else None,
        equipment_name=listing.equipment.name if listing.equipment else None,
        implement_name=listing.implement.name if listing.implement else None,
        implement_category_label=listing.implement.category if listing.implement else None,
        images=build_image_urls(image_paths),
        requests_count=len(listing.requests or []),
        created_at=listing.created_at,
    )


def request_to_response(request: SharingRequest) -> SharingRequestResponse:
    listing = request.listing
    owner_name = listing.owner.full_name if listing and listing.owner else None
    contact = None
    if request.status == 'accepted' and listing is not None:
        contact = listing.contact_info
    return SharingRequestResponse(
        id=request.id,
        listing_id=request.listing_id,
        message=request.message,
        desired_from=request.desired_from,
        desired_to=request.desired_to,
        status=request.status,
        requester_id=request.requester_id,
        requester_name=request.requester.full_name if request.requester else '',
        owner_response=request.owner_response,
        listing_title=listing.title if listing else '',
        listing_type=listing.type if listing else '',
        listing_owner_name=owner_name,
        listing_contact_info=contact,
        created_at=request.created_at,
    )


async def get_listing_or_404(db: AsyncSession, listing_id: UUID) -> SharingListing:
    result = await db.execute(
        select(SharingListing)
        .options(*listing_load_options())
        .where(SharingListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Объявление не найдено')
    return listing


async def get_request_or_404(db: AsyncSession, request_id: UUID) -> SharingRequest:
    result = await db.execute(
        select(SharingRequest).options(*request_load_options()).where(SharingRequest.id == request_id)
    )
    request = result.scalar_one_or_none()
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Заявка не найдена')
    return request


async def resolve_coordinates(
    db: AsyncSession,
    payload: SharingListingCreate,
) -> tuple[float | None, float | None]:
    latitude = payload.lat
    longitude = payload.lng

    if payload.field_id is not None and (latitude is None or longitude is None):
        field = await db.get(Location, payload.field_id)
        if field is not None:
            if latitude is None and field.latitude is not None:
                latitude = float(field.latitude)
            if longitude is None and field.longitude is not None:
                longitude = float(field.longitude)

    if payload.equipment_id is not None and (latitude is None or longitude is None):
        equipment = await db.get(Equipment, payload.equipment_id)
        if equipment is not None:
            if latitude is None and equipment.latitude is not None:
                latitude = float(equipment.latitude)
            if longitude is None and equipment.longitude is not None:
                longitude = float(equipment.longitude)

    return latitude, longitude


async def validate_resources(db: AsyncSession, payload: SharingListingCreate) -> None:
    if payload.field_id is not None:
        field = await db.get(Location, payload.field_id)
        if field is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Поле не найдено')
    if payload.equipment_id is not None:
        equipment = await db.get(Equipment, payload.equipment_id)
        if equipment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Техника не найдена')
    if payload.implement_id is not None:
        implement = await db.get(Implement, payload.implement_id)
        if implement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Приспособление не найдено',
            )


async def create_notification(
    db: AsyncSession,
    *,
    employee_id: UUID,
    type: str,
    title: str,
    body: str | None,
    link: str | None = None,
) -> None:
    db.add(
        Notification(
            employee_id=employee_id,
            type=type,
            title=title,
            body=body,
            link=link,
        )
    )


@router.get('/listings', response_model=list[SharingListingResponse])
async def list_listings(
    type: str | None = Query(None),
    status: str = Query('active'),
    region: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[SharingListingResponse]:
    query = select(SharingListing).options(*listing_load_options())

    if type is not None:
        query = query.where(SharingListing.type == type)
    if status is not None:
        query = query.where(SharingListing.status == status)
    if region is not None:
        query = query.where(SharingListing.region.ilike(f'%{region}%'))

    query = query.order_by(SharingListing.created_at.desc())
    result = await db.execute(query)
    return [listing_to_response(item) for item in result.scalars().all()]


@router.get('/listings/my', response_model=list[SharingListingResponse])
async def list_my_listings(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[SharingListingResponse]:
    query = (
        select(SharingListing)
        .options(*listing_load_options())
        .where(SharingListing.owner_id == current.id)
    )
    if status is not None:
        query = query.where(SharingListing.status == status)
    query = query.order_by(SharingListing.created_at.desc())
    result = await db.execute(query)
    return [listing_to_response(item) for item in result.scalars().all()]


@router.get('/listings/{listing_id}', response_model=SharingListingResponse)
async def get_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> SharingListingResponse:
    return listing_to_response(await get_listing_or_404(db, listing_id))


@router.post('/listings', response_model=SharingListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: SharingListingCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SharingListingResponse:
    await validate_resources(db, payload)
    latitude, longitude = await resolve_coordinates(db, payload)

    listing = SharingListing(
        type=payload.type,
        title=payload.title,
        description=payload.description,
        price_per_unit=Decimal(str(payload.price_per_unit)) if payload.price_per_unit is not None else None,
        price_unit=payload.price_unit,
        location_id=payload.field_id,
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        owner_id=current.id,
        status='active',
        latitude=Decimal(str(latitude)) if latitude is not None else None,
        longitude=Decimal(str(longitude)) if longitude is not None else None,
        region=payload.region,
        contact_info=payload.contact_info,
        images=normalize_image_paths(payload.images),
    )
    db.add(listing)
    await db.commit()
    return listing_to_response(await get_listing_or_404(db, listing.id))


@router.patch('/listings/{listing_id}', response_model=SharingListingResponse)
async def update_listing(
    listing_id: UUID,
    payload: SharingListingUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SharingListingResponse:
    listing = await get_listing_or_404(db, listing_id)
    if not is_owner_or_admin(listing, current):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    update_data = payload.model_dump(exclude_unset=True)
    if 'lat' in update_data:
        value = update_data.pop('lat')
        listing.latitude = Decimal(str(value)) if value is not None else None
    if 'lng' in update_data:
        value = update_data.pop('lng')
        listing.longitude = Decimal(str(value)) if value is not None else None
    if 'price_per_unit' in update_data:
        value = update_data.pop('price_per_unit')
        listing.price_per_unit = Decimal(str(value)) if value is not None else None
    if 'images' in update_data:
        listing.images = normalize_image_paths(update_data.pop('images'))

    for field, value in update_data.items():
        setattr(listing, field, value)

    db.add(listing)
    await db.commit()
    return listing_to_response(await get_listing_or_404(db, listing.id))


@router.patch('/listings/{listing_id}/status', response_model=SharingListingResponse)
async def update_listing_status(
    listing_id: UUID,
    payload: SharingListingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SharingListingResponse:
    listing = await get_listing_or_404(db, listing_id)
    if not is_owner_or_admin(listing, current):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    listing.status = payload.status
    db.add(listing)
    await db.commit()
    return listing_to_response(await get_listing_or_404(db, listing.id))


@router.delete('/listings/{listing_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> None:
    listing = await get_listing_or_404(db, listing_id)
    if not is_owner_or_admin(listing, current):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    listing.status = 'done'
    db.add(listing)
    await db.commit()


@router.post('/requests', response_model=SharingRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: SharingRequestCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SharingRequestResponse:
    listing = await get_listing_or_404(db, payload.listing_id)

    if listing.owner_id == current.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Нельзя оставить заявку на своё объявление',
        )
    if listing.status != 'active':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Объявление недоступно для заявок',
        )

    request = SharingRequest(
        listing_id=payload.listing_id,
        requester_id=current.id,
        message=payload.message,
        desired_from=payload.desired_from,
        desired_to=payload.desired_to,
        status='pending',
    )
    db.add(request)
    await db.flush()

    await create_notification(
        db,
        employee_id=listing.owner_id,
        type='sharing_request',
        title=f'Новая заявка: {listing.title}',
        body=f'{current.full_name}: {payload.message or "без сообщения"}',
        link='/sharing',
    )

    await db.commit()
    return request_to_response(await get_request_or_404(db, request.id))


@router.get('/requests/incoming', response_model=list[SharingRequestResponse])
async def list_incoming_requests(
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[SharingRequestResponse]:
    result = await db.execute(
        select(SharingRequest)
        .join(SharingListing, SharingRequest.listing_id == SharingListing.id)
        .options(*request_load_options())
        .where(SharingListing.owner_id == current.id)
        .order_by(SharingRequest.created_at.desc())
    )
    return [request_to_response(item) for item in result.scalars().all()]


@router.get('/requests/outgoing', response_model=list[SharingRequestResponse])
async def list_outgoing_requests(
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[SharingRequestResponse]:
    result = await db.execute(
        select(SharingRequest)
        .options(*request_load_options())
        .where(SharingRequest.requester_id == current.id)
        .order_by(SharingRequest.created_at.desc())
    )
    return [request_to_response(item) for item in result.scalars().all()]


@router.patch('/requests/{request_id}', response_model=SharingRequestResponse)
async def update_request(
    request_id: UUID,
    payload: SharingRequestStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> SharingRequestResponse:
    request = await get_request_or_404(db, request_id)
    listing = request.listing

    if listing is None or listing.owner_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    request.status = payload.status
    if payload.owner_response is not None:
        request.owner_response = payload.owner_response

    if payload.status == 'accepted':
        body = f'Ваша заявка на "{listing.title}" принята.'
        if payload.owner_response:
            body = f'{body} {payload.owner_response}'
        if listing.contact_info:
            body = f'{body} Контакт: {listing.contact_info}'
        await create_notification(
            db,
            employee_id=request.requester_id,
            type='sharing_accepted',
            title=f'Заявка принята: {listing.title}',
            body=body,
            link='/sharing',
        )
    elif payload.status == 'rejected':
        body = f'Ваша заявка на "{listing.title}" отклонена.'
        if payload.owner_response:
            body = f'{body} {payload.owner_response}'
        await create_notification(
            db,
            employee_id=request.requester_id,
            type='sharing_rejected',
            title=f'Заявка отклонена: {listing.title}',
            body=body,
            link='/sharing',
        )

    db.add(request)
    await db.commit()
    return request_to_response(await get_request_or_404(db, request.id))
