"""
API endpoints for user favorites (database storage)

All user data must be stored in database for:
- Persistence across container restarts
- Multi-user support (each user has their own favorites)
- Horizontal scalability (multiple backend instances)
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.favorites_service import (
    get_favorites,
    add_favorite,
    remove_favorite,
    get_all_preferences,
    update_preferences,
)

router = APIRouter(prefix="/user", tags=["user-favorites"])


# === Namespace Favorites ===

@router.get("/favorites")
async def get_favorite_namespaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's favorite namespaces from database"""
    try:
        favorites = await get_favorites(db, current_user.id, "namespace")
        return {
            "success": True,
            "message": "Favorites retrieved successfully",
            "favorite_namespaces": favorites
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
    namespace = request.get("namespace", "").strip()
    if not namespace:
        raise HTTPException(status_code=400, detail="Namespace is required")

    try:
        favorites = await add_favorite(db, current_user.id, "namespace", namespace)
        return {
            "success": True,
            "message": f"Namespace '{namespace}' added to favorites",
            "favorite_namespaces": favorites
        }
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
        favorites = await remove_favorite(db, current_user.id, "namespace", namespace)
        return {
            "success": True,
            "message": f"Namespace '{namespace}' removed from favorites",
            "favorite_namespaces": favorites
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove favorite: {str(e)}"
        )


# === Collection Favorites ===

@router.get("/favorites/collections")
async def get_favorite_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's favorite collections from database"""
    try:
        favorites = await get_favorites(db, current_user.id, "collection")
        return {
            "success": True,
            "message": "Favorite collections retrieved successfully",
            "favorite_collections": favorites
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
    collection = request.get("collection", "").strip()
    if not collection:
        raise HTTPException(status_code=400, detail="Collection is required")

    try:
        favorites = await add_favorite(db, current_user.id, "collection", collection)
        return {
            "success": True,
            "message": f"Collection '{collection}' added to favorites",
            "favorite_collections": favorites
        }
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
        favorites = await remove_favorite(db, current_user.id, "collection", collection)
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


# === Module Favorites ===

@router.get("/favorites/modules")
async def get_favorite_modules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's favorite modules from database"""
    try:
        favorites = await get_favorites(db, current_user.id, "module")
        return {
            "success": True,
            "message": "Favorite modules retrieved successfully",
            "favorite_modules": favorites
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
    module = request.get("module", "").strip()
    if not module:
        raise HTTPException(status_code=400, detail="Module is required")

    try:
        favorites = await add_favorite(db, current_user.id, "module", module)
        return {
            "success": True,
            "message": f"Module '{module}' added to favorites",
            "favorite_modules": favorites
        }
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
        favorites = await remove_favorite(db, current_user.id, "module", module)
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


# === General Preferences ===

@router.get("/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get all user preferences from database"""
    try:
        preferences = await get_all_preferences(db, current_user.id)
        return {
            "success": True,
            "preferences": preferences
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get preferences: {str(e)}"
        )


@router.put("/preferences")
async def update_user_preferences_endpoint(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update user preferences in database"""
    try:
        preferences = await update_preferences(
            db=db,
            user_id=current_user.id,
            interface_settings=request.get("interface_settings"),
            galaxy_settings=request.get("galaxy_settings"),
            favorite_namespaces=request.get("favorite_namespaces")
        )
        return {
            "success": True,
            "message": "Preferences updated successfully",
            "preferences": preferences
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}"
        )
