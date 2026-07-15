"""HTTP client for AgroDesk backend API (PostgreSQL path for the bot)."""

from __future__ import annotations

import logging
from datetime import date, datetime, time
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class ApiClient:
    BASE = settings.api_base_url.rstrip('/')
    _tokens: dict[int, str] = {}

    async def _get_token(self, tg_id: int) -> str | None:
        cached = self._tokens.get(tg_id)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f'{self.BASE}/api/auth/bot-token',
                    json={
                        'telegram_id': tg_id,
                        'secret': settings.bot_internal_secret,
                    },
                )
                if response.status_code != 200:
                    logger.warning(
                        'bot-token failed for tg_id=%s status=%s body=%s',
                        tg_id,
                        response.status_code,
                        response.text[:300],
                    )
                    return None
                token = response.json().get('access_token')
                if not token:
                    return None
                self._tokens[tg_id] = str(token)
                return self._tokens[tg_id]
        except Exception:
            logger.exception('bot-token request failed for tg_id=%s', tg_id)
            return None

    @staticmethod
    def _h(token: str) -> dict[str, str]:
        return {'Authorization': f'Bearer {token}'}

    async def _request(
        self,
        tg_id: int,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        retry_auth: bool = True,
    ) -> httpx.Response | None:
        token = await self._get_token(tg_id)
        if not token:
            return None

        url = f'{self.BASE}{path}'
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.request(
                    method,
                    url,
                    headers=self._h(token),
                    json=json,
                    params=params,
                )
                if response.status_code == 401 and retry_auth:
                    self.invalidate_token(tg_id)
                    return await self._request(
                        tg_id,
                        method,
                        path,
                        json=json,
                        params=params,
                        retry_auth=False,
                    )
                return response
        except Exception:
            logger.exception('%s %s failed for tg_id=%s', method, path, tg_id)
            return None

    async def get_employee(self, tg_id: int) -> dict | None:
        response = await self._request(tg_id, 'GET', '/api/employees/me')
        if response is None or response.status_code != 200:
            if response is not None:
                logger.warning('get_employee status=%s', response.status_code)
            return None
        try:
            return response.json()
        except Exception:
            logger.exception('get_employee parse failed')
            return None

    async def is_admin(self, tg_id: int) -> bool:
        employee = await self.get_employee(tg_id)
        if not employee:
            return False
        return str(employee.get('role', '')) in ('admin', 'manager')

    async def get_locations(self, tg_id: int) -> list[dict]:
        return await self._get_list(tg_id, '/api/locations', params={'is_active': True})

    async def get_work_types(self, tg_id: int) -> list[dict]:
        return await self._get_list(tg_id, '/api/work-types', params={'is_active': True})

    async def get_equipment(self, tg_id: int) -> list[dict]:
        return await self._get_list(tg_id, '/api/equipment', params={'is_active': True})

    async def open_shift(
        self,
        tg_id: int,
        location_id: str,
        work_type_id: str,
        equipment_id: str | None,
        lat: float | None,
        lng: float | None,
    ) -> dict | None:
        body: dict[str, Any] = {
            'location_id': location_id,
            'work_type_id': work_type_id,
            'equipment_id': equipment_id,
            'latitude': lat,
            'longitude': lng,
        }
        response = await self._request(tg_id, 'POST', '/api/shifts', json=body)
        if response is None or response.status_code not in (200, 201):
            if response is not None:
                logger.warning(
                    'open_shift status=%s body=%s',
                    response.status_code,
                    response.text[:300],
                )
            return None
        try:
            return response.json()
        except Exception:
            logger.exception('open_shift parse failed')
            return None

    async def close_shift(self, tg_id: int, description: str) -> dict | None:
        active = await self.get_active_shift(tg_id)
        if not active:
            return None
        shift_id = active.get('id')
        if not shift_id:
            return None
        return await self.close_shift_for_employee(tg_id, str(shift_id), description)

    async def get_active_shift(self, tg_id: int) -> dict | None:
        shifts = await self._get_list(tg_id, '/api/shifts', params={'status': 'open'})
        if not shifts:
            return None
        return shifts[0]

    async def get_all_employees(self, tg_id: int) -> list[dict]:
        return await self._get_list(tg_id, '/api/employees', params={'is_active': True})

    async def get_shifts_for_date(self, tg_id: int, date_str: str) -> list[dict]:
        return await self._get_list(
            tg_id,
            '/api/shifts',
            params={'from_date': date_str, 'to_date': date_str},
        )

    async def open_shift_for_employee(
        self,
        admin_tg_id: int,
        employee_id: str,
        location_id: str,
        work_type_id: str,
        equipment_id: str | None,
        start_time: str,
        end_time: str,
        description: str,
    ) -> dict | None:
        shift_date, start_t = self._split_datetime(start_time)
        _, end_t = self._split_datetime(end_time)
        if shift_date is None or start_t is None or end_t is None:
            logger.warning('open_shift_for_employee: invalid datetime %s / %s', start_time, end_time)
            return None

        body: dict[str, Any] = {
            'employee_id': employee_id,
            'date': shift_date,
            'start_time': start_t,
            'end_time': end_t,
            'location_id': location_id,
            'work_type_id': work_type_id,
            'equipment_id': equipment_id,
            'description': description or None,
        }
        response = await self._request(admin_tg_id, 'POST', '/api/shifts/manual', json=body)
        if response is None or response.status_code not in (200, 201):
            if response is not None:
                logger.warning(
                    'open_shift_for_employee status=%s body=%s',
                    response.status_code,
                    response.text[:300],
                )
            return None
        try:
            return response.json()
        except Exception:
            logger.exception('open_shift_for_employee parse failed')
            return None

    async def close_shift_for_employee(
        self,
        admin_tg_id: int,
        shift_id: str,
        description: str,
    ) -> dict | None:
        response = await self._request(
            admin_tg_id,
            'POST',
            f'/api/shifts/{shift_id}/close',
            json={'description': description},
        )
        if response is None or response.status_code != 200:
            if response is not None:
                logger.warning(
                    'close_shift status=%s body=%s',
                    response.status_code,
                    response.text[:300],
                )
            return None
        try:
            return response.json()
        except Exception:
            logger.exception('close_shift parse failed')
            return None

    async def get_active_shifts_all(self, admin_tg_id: int) -> list[dict]:
        return await self._get_list(admin_tg_id, '/api/shifts', params={'status': 'open'})

    async def get_dashboard_stats(self, tg_id: int) -> dict | None:
        response = await self._request(tg_id, 'GET', '/api/dashboard/stats')
        if response is None or response.status_code != 200:
            if response is not None:
                logger.warning('get_dashboard_stats status=%s', response.status_code)
            return None
        try:
            return response.json()
        except Exception:
            logger.exception('get_dashboard_stats parse failed')
            return None

    def invalidate_token(self, tg_id: int) -> None:
        self._tokens.pop(tg_id, None)

    async def _get_list(
        self,
        tg_id: int,
        path: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> list[dict]:
        response = await self._request(tg_id, 'GET', path, params=params)
        if response is None or response.status_code != 200:
            if response is not None:
                logger.warning('%s status=%s', path, response.status_code)
            return []
        try:
            data = response.json()
            return data if isinstance(data, list) else []
        except Exception:
            logger.exception('parse list failed for %s', path)
            return []

    @staticmethod
    def _split_datetime(value: str) -> tuple[str | None, str | None]:
        raw = str(value or '').strip()
        if not raw:
            return None, None

        normalized = raw.replace('T', ' ')
        if ' ' in normalized:
            date_part, time_part = normalized.split(' ', 1)
            time_part = time_part[:8]
            if len(time_part) == 5:
                time_part = f'{time_part}:00'
            try:
                date.fromisoformat(date_part)
                time.fromisoformat(time_part)
            except ValueError:
                return None, None
            return date_part, time_part

        if len(raw) == 10:
            try:
                date.fromisoformat(raw)
            except ValueError:
                return None, None
            return raw, '00:00:00'

        try:
            parsed = datetime.fromisoformat(raw)
            return parsed.date().isoformat(), parsed.time().replace(microsecond=0).isoformat()
        except ValueError:
            try:
                time.fromisoformat(raw if len(raw) > 5 else f'{raw}:00')
            except ValueError:
                return None, None
            return date.today().isoformat(), raw if len(raw) > 5 else f'{raw}:00'
