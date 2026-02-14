"""Application configuration from environment. All Railway variable names unchanged."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Required
    DATABASE_URL: str

    # Telegram
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    MINI_APP_URL: Optional[str] = None
    DEPLOY_NOTIFY_CHAT_ID: Optional[str] = None

    # GitHub
    GITHUB_ACCESS_TOKEN: Optional[str] = None
    GITHUB_REPO: Optional[str] = None

    # Backend URL (for frontend config)
    BACKEND_URL: Optional[str] = None

    # Optional
    OPENROUTER_API_KEY: Optional[str] = None
    ADMIN_IDS: Optional[str] = None  # comma-separated Telegram user IDs


def get_settings() -> Settings:
    """Load and validate settings. Call at app startup."""
    return Settings()
