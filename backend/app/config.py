from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    DATABASE_URL: str
    SECRET_KEY: str
    ALLOWED_ORIGINS: str = 'http://localhost:5173'
    API_URL: str = 'http://localhost:8000'

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',') if origin.strip()]

    @property
    def api_url(self) -> str:
        return self.API_URL.rstrip('/')


settings = Settings()
