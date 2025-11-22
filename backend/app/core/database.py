"""
Database configuration and session management

Supports both SQLite (development) and PostgreSQL (production)
based on DATABASE_TYPE setting in config.py
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Create async engine based on database type
engine = create_async_engine(
    settings.database_url,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    future=True,
    # SQLite specific settings
    connect_args={"check_same_thread": False} if settings.DATABASE_TYPE.lower() == "sqlite" else {}
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """
    Dependency to get database session

    Usage in FastAPI endpoints:
    ```python
    @app.get("/")
    async def read_root(db: AsyncSession = Depends(get_db)):
        ...
    ```
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """
    Initialize database - create all tables

    Call this on application startup
    """
    async with engine.begin() as conn:
        # Import all models here to ensure they are registered
        from app.models.user import User
        from app.models.playbook import Playbook

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
