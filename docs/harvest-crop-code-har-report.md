# Отчёт: почему harvest‑культура не сохранялась (по `localhost.har`)

## Факт из HAR

Единственный write по ТМЦ:

- `PATCH http://localhost:5173/api/inventory/3de26f5e-…`
- **Request body** содержал культуру:

```json
{
  "name": "КРУТАЯ ШТУЧКА",
  "category": "harvest",
  "unit": "кг",
  "min_stock": 11111,
  "total_capacity": 111111,
  "is_active": true,
  "crop_code": "wheat"
}
```

- **Response 200** — без полей `crop_code` и `is_harvest`:

```json
{
  "id": "3de26f5e-…",
  "category": "harvest",
  "is_active": true,
  "is_critical": true
  // нет crop_code, нет is_harvest
}
```

Во всём HAR **ни один** ответ `/api/inventory*` не содержал ключ `crop_code`.

## Где разрыв

```
UI (crop_code=wheat) → PATCH через Vite :5173
       → proxy target localhost:8000  ← СТАРЫЙ процесс (code_head=032)
       → 200 без crop_code в JSON
       → FE: toast «Позиция обновлена»
       → список/форма без культуры
```

Актуальный код (с `crop_code` / `is_harvest` в `InventoryItemResponse`) слушал **:8033** (`code_head=038`).  
Vite по умолчанию проксирует на **:8000** (`vite.config.ts` → `http://localhost:8000`).

Итог: фронт отправлял культуру правильно; «успех» был от старого API, который поле не отдавал (и по сути не участвовал в harvest‑контракте).

## Что сделано

1. Перезапуск актуального `uvicorn` на **:8000** (порт Vite proxy).
2. Guard в `useUpdateInventoryItem`: если в PATCH ушёл `crop_code`, а в ответе его нет — ошибка с подсказкой про backend, а не ложный success.

## Проверка

После Ctrl+F5 на `/inventory`:

1. Сохранить harvest‑позицию с культурой.
2. В Network: ответ PATCH должен содержать `"crop_code":"…"`.
3. `GET /api/health` через UI-прокси → `code_head` ≥ harvest‑ревизий (038+), не `032`.
