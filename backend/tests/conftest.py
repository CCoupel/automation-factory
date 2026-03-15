"""
Shared test fixtures for integration tests.

Uses an in-memory SQLite database per test with automatic rollback.
Existing unit tests (test_ansible_*, test_galaxy_*) are unaffected.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User
from app.models.playbook import Playbook
from app.models.user_preferences import UserPreferences
from app.models.playbook_collaboration import PlaybookShare, PlaybookAuditLog
from app.models.custom_variable_type import CustomVariableType

# ---------------------------------------------------------------------------
# Database fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def test_engine():
    """Create an in-memory SQLite async engine for each test."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_session(test_engine):
    """Create an async session bound to the in-memory engine."""
    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


# ---------------------------------------------------------------------------
# FastAPI app fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def test_app(test_engine):
    """
    Return the FastAPI app with ``get_db`` overridden to use the test engine.

    The import is deferred so the override is installed before any request.
    """
    from app.main import app

    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False,
    )

    async def _override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_client(test_app):
    """httpx AsyncClient wired to the test app."""
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def test_user(test_session):
    """Create a regular active user and return it."""
    user = User(
        email="testuser@example.com",
        username="testuser",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_admin=False,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(test_session):
    """Create an active admin user and return it."""
    user = User(
        email="admin@example.com",
        username="admin",
        hashed_password=get_password_hash("adminpass123"),
        is_active=True,
        is_admin=True,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


def _make_token(user: User) -> str:
    """Build a JWT for the given user."""
    return create_access_token(data={"sub": user.id, "username": user.username})


# ---------------------------------------------------------------------------
# Authenticated client fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def authenticated_client(test_app, test_user):
    """AsyncClient with a valid JWT for ``test_user``."""
    token = _make_token(test_user)
    transport = ASGITransport(app=test_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        yield client


@pytest_asyncio.fixture
async def admin_client(test_app, admin_user):
    """AsyncClient with a valid JWT for ``admin_user``."""
    token = _make_token(admin_user)
    transport = ASGITransport(app=test_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        yield client


# ---------------------------------------------------------------------------
# Data fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def test_playbook(test_session, test_user):
    """Create a playbook owned by ``test_user``."""
    playbook = Playbook(
        name="Test Playbook",
        description="A playbook for testing",
        content={"plays": []},
        owner_id=test_user.id,
    )
    test_session.add(playbook)
    await test_session.commit()
    await test_session.refresh(playbook)
    return playbook
