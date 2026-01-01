from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Ansible Builder"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176,http://127.0.0.1:5177,http://127.0.0.1:5178,http://127.0.0.1:5179,http://127.0.0.1:5180,http://localhost:3000,http://192.168.1.84:5173,http://192.168.1.84:5174,http://192.168.1.84:5175,http://192.168.1.84:5176,http://192.168.1.84:5177,http://192.168.1.84:5178,http://192.168.1.84:5179,http://192.168.1.84:5180"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # Database Configuration
    # Choose database type: "sqlite" or "postgresql"
    DATABASE_TYPE: str = "sqlite"

    # SQLite Configuration (used when DATABASE_TYPE="sqlite")
    SQLITE_DB_PATH: str = "/tmp/ansible_builder.db"

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

    # Galaxy Configuration
    GALAXY_PUBLIC_URL: str = "https://galaxy.ansible.com"
    GALAXY_PUBLIC_ENABLED: bool = True  # Set to False to disable public Galaxy
    GALAXY_PRIVATE_URL: str = ""  # Empty = no private Galaxy configured
    GALAXY_PRIVATE_TOKEN: str = ""  # Token for private Galaxy authentication
    GALAXY_PREFERRED_SOURCE: str = "public"  # public | private | both

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
