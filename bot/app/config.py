import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    bot_token: str = os.environ["BOT_TOKEN"]
    google_sheets_name: str = os.environ.get("GOOGLE_SHEETS_NAME", "worktime_bot")
    # Путь к файлу - для локальной разработки
    google_creds_path: str = os.environ.get("GOOGLE_CREDS_PATH", "credentials/service_account.json")
    # JSON строкой - для Bothost/продакшн (приоритет выше)
    google_creds_json: str | None = os.environ.get("GOOGLE_CREDS_JSON", None)
    api_base_url: str = os.environ.get("API_BASE_URL", "http://localhost:8000")
    bot_internal_secret: str = os.environ.get(
        "BOT_INTERNAL_SECRET",
        "agrodesk-bot-secret-change-me",
    )
    # Sheets is an optional mirror of PostgreSQL — off by default for local/API-only use
    sheets_mirror_enabled: bool = os.environ.get("SHEETS_MIRROR_ENABLED", "false").lower() in (
        "1",
        "true",
        "yes",
        "y",
    )


settings = Settings()
