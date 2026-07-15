from __future__ import annotations

import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image
from pydantic import BaseModel

from app.config import settings
from app.dependencies.auth import get_current_employee
from app.models.employee import Employee

UPLOADS_DIR = Path(settings.UPLOADS_DIR)
ALLOWED_FOLDERS = frozenset({'equipment', 'implements', 'sharing', 'profile'})
ALLOWED_TYPES = frozenset({'image/jpeg', 'image/jpg', 'image/png', 'image/webp'})
EXT_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
}
MAX_SIZE = 5 * 1024 * 1024

router = APIRouter()


class UploadImageResponse(BaseModel):
    url: str


def _resolve_content_type(file: UploadFile) -> str:
    ctype = (file.content_type or '').lower().strip()
    if ctype in ALLOWED_TYPES:
        return 'image/jpeg' if ctype == 'image/jpg' else ctype
    suffix = Path(file.filename or '').suffix.lower()
    mapped = EXT_TYPES.get(suffix)
    if mapped:
        return mapped
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Только JPEG, PNG или WebP',
    )


async def save_image_locally(file: UploadFile, folder: str) -> str:
    if folder not in ALLOWED_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Недопустимая папка',
        )
    _resolve_content_type(file)

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Файл больше 5 МБ',
        )

    try:
        img = Image.open(io.BytesIO(contents))
        img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Не удалось обработать изображение',
        ) from exc

    save_dir = UPLOADS_DIR / folder
    save_dir.mkdir(parents=True, exist_ok=True)
    # Safe UUID name — never trust client filename
    filename = f'{uuid.uuid4().hex}.jpg'
    img.convert('RGB').save(save_dir / filename, 'JPEG', quality=85)
    return f'/uploads/{folder}/{filename}'


@router.post('/image', response_model=UploadImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Form(...),
    _: Employee = Depends(get_current_employee),
) -> UploadImageResponse:
    url = await save_image_locally(file, folder)
    return UploadImageResponse(url=url)
