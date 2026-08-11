# Карты в АгроДеск

## Архитектура (единая карта)

Один движок отображения: **Leaflet + `MapView`** (`src/components/shared/MapView.tsx`).  
Второй картографический стек не добавляем. Редактор контура поля (`FieldContourEditor`) —
единственный второй `MapContainer` (нужен leaflet-draw); подложки те же.

Поверх `MapView` — композиция **`AgroMap`** (`src/features/maps/`):

| Слой | Роль |
|------|------|
| `MapView` | Движок: тайлы, маркеры, полигоны, fit/fly, клик |
| `AgroMap` | Оверлеи с переключателями + опциональный поиск места |
| `buildFieldOverlay` / `buildEquipmentOverlay` / `buildLocationsOverlay` | Адаптеры данных → маркеры/контуры |
| `pointInPolygon` (`src/lib/maps/geo.ts`) | Сопоставление техники с контуром поля |

**Карта предприятия** (`FieldsMap`, виджет дашборда): контуры полей + маркеры техники + места работы.  
**Карта техники** (`EquipmentMap`): маркеры техники + контуры только тех полей, внутри
которых лежит хотя бы одна единица (point-in-polygon по `[lat,lng]`).

Переиспользование (без второго движка):

- **8.4 Места работы** — `buildLocationsOverlay` → `{ id: 'locations', markers }` в `AgroMap`
- **13.2 Шеринг** — overlay маркеров объявлений (как сейчас `SharingListingsMap` → через `AgroMap`)

## Подложки

Общий компонент: `src/components/shared/MapView.tsx`.  
Конфиг тайлов: `src/lib/maps/tiles.ts`.

| Слой | По умолчанию | Ключ |
|------|--------------|------|
| Спутник | Esri World Imagery | не нужен |
| Гибрид | Esri Imagery + подписи/дороги (Reference) | не нужен |
| Схема | OpenStreetMap | не нужен |

Переопределение: `VITE_MAP_SATELLITE_URL`, `VITE_MAP_SATELLITE_ATTRIBUTION`,  
`VITE_MAP_HYBRID_URL`, `VITE_MAP_HYBRID_PLACES_URL`, `VITE_MAP_HYBRID_ROADS_URL`,  
`VITE_MAP_TILES_URL`, `VITE_MAP_TILES_ATTRIBUTION`, `VITE_MAP_DEFAULT_BASEMAP`  
(`satellite` | `hybrid` | `osm`).

Для продакшена с гарантированными квотами рекомендуется MapTiler Satellite  
(ключ в URL тайлов, ограничить origins в кабинете MapTiler).

Редактор контура поля (`FieldContourEditor`) использует тот же переключатель слоёв.  
Режимы: **рисование нового** контура и **редактирование** углов существующего (без лишних mid-edge точек). Геометрия `[[lat,lng],…]` в JSONB не менялась.

## Кадастр / Росреестр

**Отказ от кадастровой интеграции зафиксирован в продукте.**  
Автозагрузка геометрии по кадастровому номеру **не реализована и не планируется** без отдельного договора/API.

Причины:
- нет стабильного бесплатного публичного API Росреестра для коммерческого встраивания;
- доступ к НСПД — через оператора по регламенту (приказ Росреестра П/0031/24);
- неофициальные/scraping-схемы ПКК нестабильны и юридически рискованны;
- коммерческие агрегаторы (например NextGIS GeoServices) требуют отдельный договор и ключ.

Поля хранят `latitude`/`longitude` (погодная/опорная точка) и `polygon` (JSONB, контур `[[lat,lng],…]`) — **только ручной ввод** на карте в форме поля.  
Ручная отрисовка контура на спутнике — **единственный** рабочий путь. Погода считается по одной точке: явные lat/lon или центроид контура (см. `field_geometry.weather_point_from_location`).

## Поиск места на карте

В форме поля и на `/fields` / `/equipment` доступен поиск населённых пунктов / адресов / `lat, lng`
через **OpenStreetMap Nominatim** (`src/lib/maps/geocode.ts`, UI: `MapLocationSearch`).  
Политика использования: https://operations.osmfoundation.org/policies/nominatim/  
(идентификация приложения, без массового scraping, ~1 запрос/с). Офлайн поиск
недоступен — карта и контуры при этом не ломаются.

Атрибуция карты: без префикса Leaflet (`AttributionControl prefix={false}`); для Esri — компактная ссылка «© Esri» (лицензионно достаточно при использовании World Imagery).
