"""
Galaxy Source Service for managing Galaxy API source configurations.

Provides CRUD operations, connection testing, and in-memory caching
for hot-reload without application restart.
"""

import logging
import time
from datetime import datetime
from typing import List, Optional, Tuple
import httpx
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.galaxy_source import GalaxySource
from app.schemas.galaxy_source import (
    GalaxySourceCreate,
    GalaxySourceUpdate,
    GalaxySourceResponse,
    GalaxySourceTestResponse,
)
from app.utils.encryption import encrypt_token, decrypt_token, mask_token
from app.core.config import settings

logger = logging.getLogger(__name__)


class GalaxySourceService:
    """Service for managing Galaxy source configurations."""

    # In-memory cache of active sources
    _cache: List[dict] = []
    _cache_loaded: bool = False

    @classmethod
    async def initialize_defaults(cls, db: AsyncSession, admin_user_id: str) -> None:
        """
        Initialize default Galaxy sources from environment variables.

        Called on first startup when no sources exist in the database.
        Creates the public Galaxy source and optionally a private one
        based on environment configuration.

        Args:
            db: Database session
            admin_user_id: ID of admin user for created_by field
        """
        result = await db.execute(select(func.count(GalaxySource.id)))
        count = result.scalar()

        if count == 0:
            logger.info("No Galaxy sources found, creating defaults from environment")

            # Create public Galaxy source
            public_source = GalaxySource(
                name="Ansible Galaxy (Public)",
                source_type="public",
                url=settings.GALAXY_PUBLIC_URL,
                is_active=settings.GALAXY_PUBLIC_ENABLED,
                priority=10,
                description="Official Ansible Galaxy public repository",
                created_by=admin_user_id,
            )
            db.add(public_source)
            logger.info(f"Created public Galaxy source: {public_source.name}")

            # Create private Galaxy source if configured in environment
            if settings.GALAXY_PRIVATE_URL:
                token_encrypted = None
                if settings.GALAXY_PRIVATE_TOKEN:
                    token_encrypted = encrypt_token(settings.GALAXY_PRIVATE_TOKEN)

                private_source = GalaxySource(
                    name="Private Galaxy",
                    source_type="private",
                    url=settings.GALAXY_PRIVATE_URL,
                    token_encrypted=token_encrypted,
                    is_active=True,
                    priority=20 if settings.GALAXY_PREFERRED_SOURCE == "private" else 30,
                    description="Private Galaxy instance from environment configuration",
                    created_by=admin_user_id,
                )
                db.add(private_source)
                logger.info(f"Created private Galaxy source: {private_source.name}")

            await db.commit()
            await cls.refresh_cache(db)

    @classmethod
    async def refresh_cache(cls, db: AsyncSession) -> None:
        """
        Refresh the in-memory cache of active sources.

        Called after any CRUD operation to ensure GalaxyRolesService
        always has up-to-date source configuration.
        """
        result = await db.execute(
            select(GalaxySource)
            .where(GalaxySource.is_active == True)
            .order_by(GalaxySource.priority.asc(), GalaxySource.created_at.asc())
        )
        sources = result.scalars().all()

        cls._cache = []
        for source in sources:
            cls._cache.append({
                "id": source.id,
                "name": source.name,
                "source_type": source.source_type,
                "url": source.url,
                "token": decrypt_token(source.token_encrypted) if source.token_encrypted else None,
                "priority": source.priority,
            })

        cls._cache_loaded = True
        logger.info(f"Galaxy source cache refreshed: {len(cls._cache)} active sources")

    @classmethod
    def get_active_sources(cls) -> List[dict]:
        """
        Get cached active sources for use by GalaxyRolesService.

        Returns a copy to prevent external modification.

        Returns:
            List of active source configurations with decrypted tokens
        """
        if not cls._cache_loaded:
            logger.warning("Galaxy source cache not loaded, returning empty list")
            return []
        return cls._cache.copy()

    @classmethod
    async def get_all(cls, db: AsyncSession) -> Tuple[List[GalaxySourceResponse], int]:
        """
        Get all Galaxy sources (admin view).

        Returns all sources regardless of active status, ordered by priority.

        Args:
            db: Database session

        Returns:
            Tuple of (list of responses, total count)
        """
        result = await db.execute(
            select(GalaxySource)
            .order_by(GalaxySource.priority.asc(), GalaxySource.created_at.asc())
        )
        sources = result.scalars().all()

        responses = []
        for source in sources:
            token_decrypted = None
            if source.token_encrypted:
                try:
                    token_decrypted = decrypt_token(source.token_encrypted)
                except Exception:
                    pass

            responses.append(GalaxySourceResponse(
                id=source.id,
                name=source.name,
                source_type=source.source_type,
                url=source.url,
                description=source.description,
                is_active=source.is_active,
                priority=source.priority,
                has_token=bool(source.token_encrypted),
                token_masked=mask_token(token_decrypted) if token_decrypted else None,
                last_test_at=source.last_test_at,
                last_test_status=source.last_test_status,
                created_at=source.created_at,
                updated_at=source.updated_at,
                created_by=source.created_by,
            ))

        return responses, len(responses)

    @classmethod
    async def get_by_id(cls, db: AsyncSession, source_id: str) -> Optional[GalaxySource]:
        """Get a Galaxy source by ID."""
        result = await db.execute(
            select(GalaxySource).where(GalaxySource.id == source_id)
        )
        return result.scalar_one_or_none()

    @classmethod
    async def create(
        cls,
        db: AsyncSession,
        data: GalaxySourceCreate,
        user_id: str
    ) -> GalaxySource:
        """
        Create a new Galaxy source.

        Args:
            db: Database session
            data: Source creation data
            user_id: ID of user creating the source

        Returns:
            Created GalaxySource instance

        Raises:
            ValueError: If validation fails (duplicate name, missing token for private)
        """
        # Validate token requirement for private sources
        if data.source_type == "private" and not data.token:
            raise ValueError("Token is required for private Galaxy sources")

        # Check for duplicate name
        existing = await db.execute(
            select(GalaxySource).where(GalaxySource.name == data.name)
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"A Galaxy source with name '{data.name}' already exists")

        # Encrypt token if provided
        token_encrypted = encrypt_token(data.token) if data.token else None

        source = GalaxySource(
            name=data.name,
            source_type=data.source_type,
            url=data.url,
            token_encrypted=token_encrypted,
            description=data.description,
            is_active=data.is_active,
            priority=data.priority,
            created_by=user_id,
        )

        db.add(source)
        await db.commit()
        await db.refresh(source)

        # Refresh cache for hot-reload
        await cls.refresh_cache(db)

        logger.info(f"Created Galaxy source: {source.name} (type={source.source_type})")
        return source

    @classmethod
    async def update(
        cls,
        db: AsyncSession,
        source_id: str,
        data: GalaxySourceUpdate,
        user_id: str
    ) -> Optional[GalaxySource]:
        """
        Update a Galaxy source.

        Args:
            db: Database session
            source_id: ID of source to update
            data: Update data (only non-None fields are updated)
            user_id: ID of user making the update

        Returns:
            Updated GalaxySource instance or None if not found

        Raises:
            ValueError: If validation fails (duplicate name)
        """
        source = await cls.get_by_id(db, source_id)
        if not source:
            return None

        # Check for duplicate name if name is being changed
        if data.name and data.name != source.name:
            existing = await db.execute(
                select(GalaxySource).where(
                    GalaxySource.name == data.name,
                    GalaxySource.id != source_id
                )
            )
            if existing.scalar_one_or_none():
                raise ValueError(f"A Galaxy source with name '{data.name}' already exists")

        # Update fields
        if data.name is not None:
            source.name = data.name
        if data.url is not None:
            source.url = data.url
        if data.description is not None:
            source.description = data.description
        if data.is_active is not None:
            source.is_active = data.is_active
        if data.priority is not None:
            source.priority = data.priority
        if data.token is not None:
            source.token_encrypted = encrypt_token(data.token)

        source.updated_by = user_id
        source.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(source)

        # Refresh cache for hot-reload
        await cls.refresh_cache(db)

        logger.info(f"Updated Galaxy source: {source.name}")
        return source

    @classmethod
    async def delete(cls, db: AsyncSession, source_id: str) -> bool:
        """
        Delete a Galaxy source.

        Args:
            db: Database session
            source_id: ID of source to delete

        Returns:
            True if deleted, False if not found

        Raises:
            ValueError: If trying to delete the last active public source
        """
        source = await cls.get_by_id(db, source_id)
        if not source:
            return False

        # Prevent deletion of the last active public source
        if source.source_type == "public" and source.is_active:
            result = await db.execute(
                select(func.count(GalaxySource.id)).where(
                    GalaxySource.source_type == "public",
                    GalaxySource.is_active == True,
                    GalaxySource.id != source_id
                )
            )
            if result.scalar() == 0:
                raise ValueError("Cannot delete the last active public Galaxy source")

        await db.delete(source)
        await db.commit()

        # Refresh cache for hot-reload
        await cls.refresh_cache(db)

        logger.info(f"Deleted Galaxy source: {source.name}")
        return True

    @classmethod
    async def reorder(
        cls,
        db: AsyncSession,
        source_ids: List[str],
        user_id: str
    ) -> bool:
        """
        Reorder Galaxy sources by setting priorities.

        Uses gap-based ordering (10, 20, 30...) to allow future insertions.

        Args:
            db: Database session
            source_ids: List of source IDs in desired order
            user_id: ID of user making the change

        Returns:
            True on success
        """
        for index, source_id in enumerate(source_ids):
            priority = (index + 1) * 10  # 10, 20, 30, ...
            await db.execute(
                update(GalaxySource)
                .where(GalaxySource.id == source_id)
                .values(
                    priority=priority,
                    updated_by=user_id,
                    updated_at=datetime.utcnow()
                )
            )

        await db.commit()

        # Refresh cache for hot-reload
        await cls.refresh_cache(db)

        logger.info(f"Reordered {len(source_ids)} Galaxy sources")
        return True

    @classmethod
    async def toggle_active(
        cls,
        db: AsyncSession,
        source_id: str,
        is_active: bool,
        user_id: str
    ) -> Optional[GalaxySource]:
        """
        Toggle the active status of a Galaxy source.

        Args:
            db: Database session
            source_id: ID of source to toggle
            is_active: New active status
            user_id: ID of user making the change

        Returns:
            Updated GalaxySource or None if not found

        Raises:
            ValueError: If trying to deactivate the last active source
        """
        source = await cls.get_by_id(db, source_id)
        if not source:
            return None

        # Prevent deactivation of the last active source
        if not is_active and source.is_active:
            result = await db.execute(
                select(func.count(GalaxySource.id)).where(
                    GalaxySource.is_active == True,
                    GalaxySource.id != source_id
                )
            )
            if result.scalar() == 0:
                raise ValueError("Cannot deactivate the last active Galaxy source")

        source.is_active = is_active
        source.updated_by = user_id
        source.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(source)

        # Refresh cache for hot-reload
        await cls.refresh_cache(db)

        logger.info(f"Toggled Galaxy source {source.name} active={is_active}")
        return source

    @classmethod
    async def test_connection(
        cls,
        url: str,
        token: Optional[str] = None,
        source_type: str = "private"
    ) -> GalaxySourceTestResponse:
        """
        Test connection to a Galaxy source.

        Tries multiple API endpoints to verify connectivity.

        Args:
            url: Galaxy API base URL
            token: Optional API token for authentication
            source_type: 'public' or 'private'

        Returns:
            Test result with success status and details
        """
        # Prepare headers
        headers = {"Accept": "application/json"}
        if token and source_type == "private":
            headers["Authorization"] = f"Token {token}"

        # Normalize URL
        url = url.rstrip('/')

        # Try different API endpoints
        test_endpoints = [
            f"{url}/api/v3/",
            f"{url}/api/",
            f"{url}/api/v3/collections/",
        ]

        start_time = time.time()

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            for endpoint in test_endpoints:
                try:
                    response = await client.get(endpoint, headers=headers)
                    elapsed_ms = int((time.time() - start_time) * 1000)

                    if response.status_code == 200:
                        data = {}
                        content_type = response.headers.get('content-type', '')
                        if content_type.startswith('application/json'):
                            try:
                                data = response.json()
                            except Exception:
                                pass

                        return GalaxySourceTestResponse(
                            success=True,
                            message=f"Successfully connected to {url}",
                            response_time_ms=elapsed_ms,
                            api_version=data.get('version') or data.get('current_version'),
                            collections_count=data.get('count') if 'count' in data else None,
                        )
                    elif response.status_code == 401:
                        return GalaxySourceTestResponse(
                            success=False,
                            message="Authentication failed - invalid or expired token",
                            response_time_ms=elapsed_ms,
                        )
                    elif response.status_code == 403:
                        return GalaxySourceTestResponse(
                            success=False,
                            message="Access forbidden - check token permissions",
                            response_time_ms=elapsed_ms,
                        )
                except httpx.TimeoutException:
                    return GalaxySourceTestResponse(
                        success=False,
                        message="Connection timeout after 10 seconds",
                    )
                except httpx.ConnectError as e:
                    return GalaxySourceTestResponse(
                        success=False,
                        message=f"Connection failed: {str(e)}",
                    )
                except Exception as e:
                    logger.warning(f"Test endpoint {endpoint} failed: {e}")
                    continue

        elapsed_ms = int((time.time() - start_time) * 1000)
        return GalaxySourceTestResponse(
            success=False,
            message="Could not connect to Galaxy API - no valid endpoint found",
            response_time_ms=elapsed_ms,
        )

    @classmethod
    async def test_source_by_id(
        cls,
        db: AsyncSession,
        source_id: str
    ) -> GalaxySourceTestResponse:
        """
        Test connection to an existing Galaxy source and update its status.

        Args:
            db: Database session
            source_id: ID of source to test

        Returns:
            Test result with success status and details
        """
        source = await cls.get_by_id(db, source_id)
        if not source:
            return GalaxySourceTestResponse(
                success=False,
                message="Galaxy source not found",
            )

        # Decrypt token if exists
        token = None
        if source.token_encrypted:
            try:
                token = decrypt_token(source.token_encrypted)
            except Exception:
                pass

        # Run test
        result = await cls.test_connection(source.url, token, source.source_type)

        # Update source with test results
        source.last_test_at = datetime.utcnow()
        source.last_test_status = "success" if result.success else "failed"
        await db.commit()

        return result
