"""
Simplified API endpoints for user favorites (file-based storage for development)
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
import json
import os

router = APIRouter(prefix="/user", tags=["user-favorites"])

# Simple file-based storage for development/testing
FAVORITES_FILE = "/tmp/user_favorites.json"

def load_favorites() -> List[str]:
    """Load favorite namespaces from file"""
    if os.path.exists(FAVORITES_FILE):
        try:
            with open(FAVORITES_FILE, 'r') as f:
                data = json.load(f)
                return data.get("favorite_namespaces", [])
        except:
            pass
    return []

def save_favorites(favorites: List[str]):
    """Save favorite namespaces to file"""
    with open(FAVORITES_FILE, 'w') as f:
        json.dump({"favorite_namespaces": favorites}, f)

@router.get("/favorites")
async def get_favorite_namespaces() -> Dict[str, Any]:
    """Get user's favorite namespaces"""
    try:
        favorites = load_favorites()
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
async def add_favorite_namespace(request: dict) -> Dict[str, Any]:
    """Add namespace to favorites"""
    try:
        namespace = request.get("namespace", "").strip()
        if not namespace:
            raise HTTPException(status_code=400, detail="Namespace is required")
        
        favorites = load_favorites()
        
        if namespace not in favorites:
            favorites.append(namespace)
            save_favorites(favorites)
        
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
async def remove_favorite_namespace(namespace: str) -> Dict[str, Any]:
    """Remove namespace from favorites"""
    try:
        favorites = load_favorites()
        
        if namespace in favorites:
            favorites.remove(namespace)
            save_favorites(favorites)
        
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