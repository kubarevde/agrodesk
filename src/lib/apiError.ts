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
      case 503:
        return 'Сервис временно недоступен. Возможно, не применены миграции БД'
      case 422:
        return 'Некорректные данные формы'
      case 500:
        return 'Внутренняя ошибка сервера'
      default:
        break
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

/** Split network vs forbidden for page-level empty states. */
export function accessLoadErrorDescription(
  error: unknown,
  fallback = 'Не удалось загрузить данные.',
): { title: string; description: string } {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return {
        title: 'Нет связи с сервером',
        description: 'Проверьте интернет или что backend запущен.',
      }
    }
    if (error.response.status === 403) {
      return {
        title: 'Раздел недоступен',
        description: 'У вашей роли нет прав на эти данные. Обратитесь к администратору.',
      }
    }
  }
  return {
    title: fallback,
    description: apiErrorMessage(error, 'Попробуйте обновить страницу.'),
  }
}
