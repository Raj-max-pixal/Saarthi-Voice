from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    gnani_api_key: str
    gnani_base_url: str = "https://api.vachana.ai"
    evon_base_url: str = "http://localhost:8001/v1"
    evon_api_key: str = ""
    evon_model: str = "gnani/gnani-evon-v3.3-30B-A3B"
    allowed_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
