from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    DATABASE_URL: str
    SECRET_KEY: str
    BOT_INTERNAL_SECRET: str = 'agrodesk-bot-secret-change-me'
    TELEGRAM_BOT_TOKEN: str | None = None
    ALLOWED_ORIGINS: str = 'http://localhost:5173'
    API_URL: str = 'http://localhost:8000'
    SUPERADMIN_EMAIL: str | None = None
    SUPERADMIN_PASSWORD: str | None = None
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    LOG_LEVEL: str = 'INFO'
    RUN_SEED_ON_START: bool = True
    UPLOADS_DIR: str = './uploads'

    @property
    def bot_internal_secret(self) -> str:
        return self.BOT_INTERNAL_SECRET

    @property
    def telegram_bot_token(self) -> str | None:
        token = (self.TELEGRAM_BOT_TOKEN or '').strip()
        return token or None

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',') if origin.strip()]

    @property
    def api_url(self) -> str:
        return self.API_URL.rstrip('/')

    @property
    def superadmin_email(self) -> str | None:
        value = (self.SUPERADMIN_EMAIL or '').strip()
        return value or None

    @property
    def superadmin_password(self) -> str | None:
        value = (self.SUPERADMIN_PASSWORD or '').strip()
        return value or None


settings = Settings()
