# Weather sources audit (AgroDesk)

Decision date: 2026-07-28. Updated: 2026-07-29 (ECMWF-via-Open-Meteo removed).
Implement only verified coordinate-based APIs.
Coordinates come from `locations.latitude` / `locations.longitude` (Field entity).

## Candidates

| Source | Lat/lon | Daily/hourly | Temp + conditions | Key | Legal free use for this app |
|--------|---------|--------------|-------------------|-----|-----------------------------|
| Open-Meteo Forecast | yes | daily + hourly | °C, WMO weather_code | no | yes (non-commercial free tier, attribution) |
| MET Norway Locationforecast 2.0 | yes | hourly (~9 days forward only) | °C, symbol_code | no (User-Agent required) | yes |
| Open-Meteo ECMWF (`ecmwf_ifs025`) | yes | daily + hourly | °C, WMO | no | yes, but **same aggregator** as primary — rejected as “second source” |
| Yandex Weather API | yes | forecast | yes | yes | **no for free product use** |
| Roshydromet / ИСП РАН | unclear | — | — | contract | **no usable public free API** |

## Architecture decision

- **Implemented sources (2):** **Open-Meteo** (primary, full calendar past/forecast) + **MET Norway** (independent API `api.met.no`, ~9-day forward horizon).
- **Removed (2026-07-29):** Open-Meteo ECMWF as second “source” — verified live: same `api.open-meteo.com/v1/forecast` endpoint; `models=ecmwf_ifs025` only. Temps often within ~0.2–1.5°C of default best_match → looked like a duplicate to users.
- **MET Norway honesty:** out-of-horizon / past dates return a clear message (not fake empty cards pretending the API failed). Month aggregation uses only overlapping days.
- **Month aggregation:** temps averaged across successful sources for that day; weather codes majority-voted.
- **Day detail:** sources stay separate; slots **Утро≈08 / День≈12 / Вечер≈20**; `dailySummary` is separate from «День».
- **Field coordinates:** `locations.latitude` / `longitude` (weather point). If missing but `polygon` (≥3 verts) exists, weather uses vertex-average **centroid**. Contour editing is manual on the satellite map (no cadastral API).
- **Agronomic recommendations:** **not implemented** (culture/region/phase handbook).
- **Weather risk advisories (agro calendar):** implemented in `advisories.py` /
  `plan_advisories.py` — frost / heavy rain / spray wind warnings attached to
  `/api/agro-plan` responses. Uses the same Open-Meteo + MET Norway fetches and
  TTL cache; does **not** change `/api/weather` contract.

## Units / codes

- Temperature: Celsius.
- Open-Meteo: WMO codes.
- MET Norway: `symbol_code` mapped to WMO-like codes for aggregation (`codes.py`).
