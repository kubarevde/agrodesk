import axios from 'axios'

/** Prefer FastAPI `detail`; otherwise map HTTP status to a clear Russian message. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      if (typeof first === 'string') return first
      if (first && typeof first === 'object' && 'msg' in first) {
        const msg = (first as { msg?: unknown }).msg
        if (typeof msg === 'string' && msg.trim()) return msg
      }
    }

    if (!error.response) {
      return 'Нет связи с API. Проверьте, что backend запущен на :8000'
    }

    switch (error.response.status) {
      case 401:
        return 'Сессия истекла. Войдите снова'
      case 403:
        return 'Недостаточно прав для этого действия'
      case 404:
        return 'Не найдено. Если это Настройки/справочники — выполните alembic upgrade head и перезапустите API'
      case 409:
        return 'Конфликт: запись уже существует или ещё используется'
      case 422:
        return 'Некорректные данные формы'
      case 500:
        return 'Внутренняя ошибка сервера'
      default:
        break
    }
  }
  return fallback
}
