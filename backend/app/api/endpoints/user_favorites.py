"""
API endpoints for user favorites (database storage)

All user data must be stored in database for:
- Persistence across container restarts
- Multi-user support (each user has their own favorites)
- Horizontal scalability (multiple backend instances)
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.user_preferences import UserPreferences

router = APIRouter(prefix="/user", tags=["user-favorites"])


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


@router.get("/favorites")
async def get_favorite_namespaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's favorite namespaces from database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)

        return {
            "success": True,
            "message": "Favorites retrieved successfully",
            "favorite_namespaces": preferences.favorite_namespaces or []
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get favorites: {str(e)}"
        )


@router.post("/favorites")
async def add_favorite_namespace(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Add namespace to user's favorites in database"""
    try:
        namespace = request.get("namespace", "").strip()
        if not namespace:
            raise HTTPException(status_code=400, detail="Namespace is required")

        preferences = await get_or_create_preferences(db, current_user.id)

        # Add to favorites if not already present
        current_favorites = preferences.favorite_namespaces or []
        if namespace not in current_favorites:
            current_favorites.append(namespace)
            preferences.favorite_namespaces = current_favorites
            await db.commit()
            await db.refresh(preferences)

        return {
            "success": True,
            "message": f"Namespace '{namespace}' added to favorites",
            "favorite_namespaces": preferences.favorite_namespaces
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add favorite: {str(e)}"
        )


@router.delete("/favorites/{namespace}")
async def remove_favorite_namespace(
    namespace: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Remove namespace from user's favorites in database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)

        # Remove from favorites if present
        current_favorites = preferences.favorite_namespaces or []
        if namespace in current_favorites:
            current_favorites.remove(namespace)
            preferences.favorite_namespaces = current_favorites
            await db.commit()
            await db.refresh(preferences)

        return {
            "success": True,
            "message": f"Namespace '{namespace}' removed from favorites",
            "favorite_namespaces": preferences.favorite_namespaces
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove favorite: {str(e)}"
        )


@router.get("/favorites/collections")
async def get_favorite_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's favorite collections from database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)
        galaxy_settings = preferences.galaxy_settings or {}

        return {
            "success": True,
            "message": "Favorite collections retrieved successfully",
            "favorite_collections": galaxy_settings.get("favorite_collections", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get favorite collections: {str(e)}"
        )


@router.post("/favorites/collections")
async def add_favorite_collection(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Add collection to user's favorites in database"""
    try:
        collection = request.get("collection", "").strip()
        if not collection:
            raise HTTPException(status_code=400, detail="Collection is required")

        preferences = await get_or_create_preferences(db, current_user.id)
        galaxy_settings = dict(preferences.galaxy_settings or {})
        favorites = list(galaxy_settings.get("favorite_collections", []))

        if collection not in favorites:
            favorites.append(collection)
            galaxy_settings["favorite_collections"] = favorites
            # Create new dict to trigger SQLAlchemy change detection
            preferences.galaxy_settings = galaxy_settings.copy()
            await db.commit()
            await db.refresh(preferences)

        return {
            "success": True,
            "message": f"Collection '{collection}' added to favorites",
            "favorite_collections": favorites
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add favorite collection: {str(e)}"
        )


@router.delete("/favorites/collections/{collection:path}")
async def remove_favorite_collection(
    collection: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Remove collection from user's favorites in database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)
        galaxy_settings = dict(preferences.galaxy_settings or {})
        favorites = list(galaxy_settings.get("favorite_collections", []))

        if collection in favorites:
            favorites.remove(collection)
            galaxy_settings["favorite_collections"] = favorites
            # Create new dict to trigger SQLAlchemy change detection
            preferences.galaxy_settings = galaxy_settings.copy()
            await db.commit()
            await db.refresh(preferences)

        return {
            "success": True,
            "message": f"Collection '{collection}' removed from favorites",
            "favorite_collections": favorites
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove favorite collection: {str(e)}"
        )


@router.get("/favorites/modules")
async def get_favorite_modules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's favorite modules from database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)
        galaxy_settings = preferences.galaxy_settings or {}

        return {
            "success": True,
            "message": "Favorite modules retrieved successfully",
            "favorite_modules": galaxy_settings.get("favorite_modules", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get favorite modules: {str(e)}"
        )


@router.post("/favorites/modules")
async def add_favorite_module(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Add module to user's favorites in database"""
    try:
        module = request.get("module", "").strip()
        if not module:
            raise HTTPException(status_code=400, detail="Module is required")

        preferences = await get_or_create_preferences(db, current_user.id)
        galaxy_settings = dict(preferences.galaxy_settings or {})
        favorites = list(galaxy_settings.get("favorite_modules", []))

        if module not in favorites:
            favorites.append(module)
            galaxy_settings["favorite_modules"] = favorites
            # Create new dict to trigger SQLAlchemy change detection
            preferences.galaxy_settings = galaxy_settings.copy()
            await db.commit()
            await db.refresh(preferences)

        return {
            "success": True,
            "message": f"Module '{module}' added to favorites",
            "favorite_modules": favorites
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add favorite module: {str(e)}"
        )


@router.delete("/favorites/modules/{module:path}")
async def remove_favorite_module(
    module: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Remove module from user's favorites in database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)
        galaxy_settings = dict(preferences.galaxy_settings or {})
        favorites = list(galaxy_settings.get("favorite_modules", []))

        if module in favorites:
            favorites.remove(module)
            galaxy_settings["favorite_modules"] = favorites
            # Create new dict to trigger SQLAlchemy change detection
            preferences.galaxy_settings = galaxy_settings.copy()
            await db.commit()
            await db.refresh(preferences)

        return {
            "success": True,
            "message": f"Module '{module}' removed from favorites",
            "favorite_modules": favorites
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove favorite module: {str(e)}"
        )


@router.get("/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get all user preferences from database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)

        return {
            "success": True,
            "preferences": preferences.to_dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get preferences: {str(e)}"
        )


@router.put("/preferences")
async def update_user_preferences(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update user preferences in database"""
    try:
        preferences = await get_or_create_preferences(db, current_user.id)

        # Update interface settings if provided
        if "interface_settings" in request:
            preferences.interface_settings = request["interface_settings"]

        # Update galaxy settings if provided
        if "galaxy_settings" in request:
            preferences.galaxy_settings = request["galaxy_settings"]

        # Update favorite namespaces if provided
        if "favorite_namespaces" in request:
            preferences.favorite_namespaces = request["favorite_namespaces"]

        await db.commit()
        await db.refresh(preferences)

        return {
            "success": True,
            "message": "Preferences updated successfully",
            "preferences": preferences.to_dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}"
        )
