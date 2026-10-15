from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings with environment variable fallback and validation."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General App Config
    APP_NAME: str = "AI Expense Management System"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Gemini API Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"

    # Database Configuration
    DATABASE_URL: str = f"sqlite:///{ROOT_DIR / 'database' / 'expenses.db'}"

    # File Upload Directory
    UPLOAD_DIR: str = str(ROOT_DIR / "uploads")

    # Allowed CORS Origins
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("UPLOAD_DIR", mode="after")
    @classmethod
    def resolve_upload_dir(cls, v: str) -> str:
        p = Path(v)
        if not p.is_absolute():
            p = (BACKEND_DIR / p).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return str(p)

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def resolve_database_url(cls, v: str) -> str:
        if v.startswith("sqlite:///") and not v.startswith("sqlite:////"):
            db_rel = v.replace("sqlite:///", "")
            p = Path(db_rel)
            if not p.is_absolute():
                p = (BACKEND_DIR / p).resolve()
                p.parent.mkdir(parents=True, exist_ok=True)
                return f"sqlite:///{p.as_posix()}"
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["*"]

    @property
    def upload_path(self) -> Path:
        """Returns validated Path object for UPLOAD_DIR and creates it if needed."""
        path = Path(self.UPLOAD_DIR).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def is_gemini_configured(self) -> bool:
        """Check if GEMINI_API_KEY is configured and not default placeholder."""
        return bool(
            self.GEMINI_API_KEY
            and self.GEMINI_API_KEY.strip()
            and self.GEMINI_API_KEY != "your_gemini_api_key_here"
        )


settings = Settings()
