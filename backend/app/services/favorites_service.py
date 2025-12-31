"""
Favorites Service

Centralized service for managing user favorites (namespaces, collections, modules).
Eliminates code duplication in user_favorites.py endpoints.
"""

from typing import List, Dict, Any, Optional, Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.models.user_preferences import UserPreferences

logger = logging.getLogger(__name__)

FavoriteType = Literal["namespace", "collection", "module"]


async def get_or_create_preferences(db: AsyncSession, user_id: str) -> UserPreferences:
    """Get user preferences or create if not exists"""
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == user_id)
    )
    preferences = result.scalar_one_or_none()

    if not preferences:
        preferences = UserPreferences(
            user_id=user_id,
            favorite_namespaces=[],
            interface_settings={},
            galaxy_settings={}
        )
        db.add(preferences)
        await db.commit()
        await db.refresh(preferences)

    return preferences


def _get_favorites_list(
    preferences: UserPreferences,
    favorite_type: FavoriteType
) -> List[str]:
    """Get favorites list based on type"""
    if favorite_type == "namespace":
        return list(preferences.favorite_namespaces or [])
    else:
        galaxy_settings = preferences.galaxy_settings or {}
        key = f"favorite_{favorite_type}s"  # favorite_collections or favorite_modules
        return list(galaxy_settings.get(key, []))


def _set_favorites_list(
    preferences: UserPreferences,
    favorite_type: FavoriteType,
    favorites: List[str]
) -> None:
    """Set favorites list based on type"""
    if favorite_type == "namespace":
        preferences.favorite_namespaces = favorites
    else:
        galaxy_settings = dict(preferences.galaxy_settings or {})
        key = f"favorite_{favorite_type}s"
        galaxy_settings[key] = favorites
        # Create new dict to trigger SQLAlchemy change detection
        preferences.galaxy_settings = galaxy_settings.copy()


async def get_favorites(
    db: AsyncSession,
    user_id: str,
    favorite_type: FavoriteType
) -> List[str]:
    """
    Get user's favorites of specified type.

    Args:
        db: Database session
        user_id: User ID
        favorite_type: Type of favorite (namespace, collection, module)

    Returns:
        List of favorite items
    """
    preferences = await get_or_create_preferences(db, user_id)
    return _get_favorites_list(preferences, favorite_type)


async def add_favorite(
    db: AsyncSession,
    user_id: str,
    favorite_type: FavoriteType,
    item: str
) -> List[str]:
    """
    Add item to user's favorites.

    Args:
        db: Database session
        user_id: User ID
        favorite_type: Type of favorite
        item: Item to add

    Returns:
        Updated list of favorites
    """
    preferences = await get_or_create_preferences(db, user_id)
    favorites = _get_favorites_list(preferences, favorite_type)

    if item not in favorites:
        favorites.append(item)
        _set_favorites_list(preferences, favorite_type, favorites)
        await db.commit()
        await db.refresh(preferences)
        logger.debug(f"Added {favorite_type} '{item}' to favorites for user {user_id}")

    return _get_favorites_list(preferences, favorite_type)


async def remove_favorite(
    db: AsyncSession,
    user_id: str,
    favorite_type: FavoriteType,
    item: str
) -> List[str]:
    """
    Remove item from user's favorites.

    Args:
        db: Database session
        user_id: User ID
        favorite_type: Type of favorite
        item: Item to remove

    Returns:
        Updated list of favorites
    """
    preferences = await get_or_create_preferences(db, user_id)
    favorites = _get_favorites_list(preferences, favorite_type)

    if item in favorites:
        favorites.remove(item)
        _set_favorites_list(preferences, favorite_type, favorites)
        await db.commit()
        await db.refresh(preferences)
        logger.debug(f"Removed {favorite_type} '{item}' from favorites for user {user_id}")

    return _get_favorites_list(preferences, favorite_type)


async def get_all_preferences(
    db: AsyncSession,
    user_id: str
) -> Dict[str, Any]:
    """
    Get all user preferences.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Dictionary of all preferences
    """
    preferences = await get_or_create_preferences(db, user_id)
    return preferences.to_dict()


async def update_preferences(
    db: AsyncSession,
    user_id: str,
    interface_settings: Optional[Dict] = None,
    galaxy_settings: Optional[Dict] = None,
    favorite_namespaces: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Update user preferences.

    Args:
        db: Database session
        user_id: User ID
        interface_settings: Optional interface settings to update
        galaxy_settings: Optional galaxy settings to update
        favorite_namespaces: Optional favorite namespaces to update

    Returns:
        Updated preferences dictionary
    """
    preferences = await get_or_create_preferences(db, user_id)

    if interface_settings is not None:
        preferences.interface_settings = interface_settings

    if galaxy_settings is not None:
        preferences.galaxy_settings = galaxy_settings

    if favorite_namespaces is not None:
        preferences.favorite_namespaces = favorite_namespaces

    await db.commit()
    await db.refresh(preferences)

    return preferences.to_dict()
