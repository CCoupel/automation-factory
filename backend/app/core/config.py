from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Ansible Builder"
    DEBUG: bool = True

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Database Configuration
    # Choose database type: "sqlite" or "postgresql"
    DATABASE_TYPE: str = "sqlite"

    # SQLite Configuration (used when DATABASE_TYPE="sqlite")
    SQLITE_DB_PATH: str = "./ansible_builder.db"

    # PostgreSQL Configuration (used when DATABASE_TYPE="postgresql")
    POSTGRES_USER: str = "ansible"
    POSTGRES_PASSWORD: str = "ansible"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "ansible_builder"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def database_url(self) -> str:
        """
        Returns the appropriate database URL based on DATABASE_TYPE
        """
        if self.DATABASE_TYPE.lower() == "sqlite":
            # SQLite URL for SQLAlchemy
            return f"sqlite+aiosqlite:///{self.SQLITE_DB_PATH}"
        else:
            # PostgreSQL URL for SQLAlchemy with asyncpg
            return (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

settings = Settings()
