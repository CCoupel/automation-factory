"""
API endpoints for user favorites (database storage)

All user data must be stored in database for:
- Persistence across container restarts
- Multi-user support (each user has their own favorites)
- Horizontal scalability (multiple backend instances)

Consolidated endpoints (v2.2.0):
- GET    /favorites/{type}           - Get favorites of a type
- POST   /favorites/{type}           - Add a favorite
- DELETE /favorites/{type}/{item}    - Remove a favorite
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Literal

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

# Type definitions for favorites
FavoriteType = Literal["namespaces", "collections", "modules"]

# Mapping from URL type to database type
TYPE_MAP = {
    "namespaces": "namespace",
    "collections": "collection",
    "modules": "module"
}

# Mapping from URL type to request field name
FIELD_MAP = {
    "namespaces": "namespace",
    "collections": "collection",
    "modules": "module"
}


# === Consolidated Favorites Endpoints ===

@router.get("/favorites/{favorite_type}")
async def get_favorites_endpoint(
    favorite_type: FavoriteType,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get user's favorites of specified type from database"""
    try:
        db_type = TYPE_MAP[favorite_type]
        favorites = await get_favorites(db, current_user.id, db_type)
        return {
            "success": True,
            "message": f"Favorite {favorite_type} retrieved successfully",
            f"favorite_{favorite_type}": favorites
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get favorite {favorite_type}: {str(e)}"
        )


@router.post("/favorites/{favorite_type}")
async def add_favorite_endpoint(
    favorite_type: FavoriteType,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Add item to user's favorites of specified type in database"""
    field_name = FIELD_MAP[favorite_type]
    item = request.get(field_name, "").strip()

    if not item:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name.capitalize()} is required"
        )

    try:
        db_type = TYPE_MAP[favorite_type]
        favorites = await add_favorite(db, current_user.id, db_type, item)
        return {
            "success": True,
            "message": f"{field_name.capitalize()} '{item}' added to favorites",
            f"favorite_{favorite_type}": favorites
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add favorite {field_name}: {str(e)}"
        )


@router.delete("/favorites/{favorite_type}/{item:path}")
async def remove_favorite_endpoint(
    favorite_type: FavoriteType,
    item: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Remove item from user's favorites of specified type in database"""
    try:
        db_type = TYPE_MAP[favorite_type]
        favorites = await remove_favorite(db, current_user.id, db_type, item)
        field_name = FIELD_MAP[favorite_type]
        return {
            "success": True,
            "message": f"{field_name.capitalize()} '{item}' removed from favorites",
            f"favorite_{favorite_type}": favorites
        }
    except Exception as e:
        field_name = FIELD_MAP[favorite_type]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove favorite {field_name}: {str(e)}"
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
