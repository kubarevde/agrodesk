from __future__ import annotations

import io
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image
from pydantic import BaseModel

from app.dependencies.auth import get_current_employee
from app.models.employee import Employee

UPLOADS_DIR = Path(os.getenv('UPLOADS_DIR', './uploads'))
ALLOWED_FOLDERS = frozenset({'equipment', 'implements', 'sharing', 'profile'})
ALLOWED_TYPES = frozenset({'image/jpeg', 'image/png', 'image/webp'})
MAX_SIZE = 5 * 1024 * 1024

router = APIRouter()


class UploadImageResponse(BaseModel):
    url: str


async def save_image_locally(file: UploadFile, folder: str) -> str:
    if folder not in ALLOWED_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Недопустимая папка',
        )
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Только JPEG/PNG/WEBP',
        )

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Файл больше 5MB',
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
    filename = f'{uuid.uuid4()}.jpg'
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
