from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    database_url: str = Field(
        default="sqlite+aiosqlite:///./free_ott_hub.db",
        alias="DATABASE_URL",
    )
    tmdb_api_key: str = Field(default="", alias="TMDB_API_KEY")
    tmdb_base_url: str = Field(
        default="https://api.themoviedb.org/3", alias="TMDB_BASE_URL"
    )
    app_env: str = Field(default="development", alias="APP_ENV")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    model_config = {"env_file": ".env", "populate_by_name": True}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
