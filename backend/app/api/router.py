"""
Main API router that aggregates all endpoint routers
"""

from fastapi import APIRouter
from app.api.endpoints import auth, playbooks, admin, common, collections, galaxy, galaxy_cache, user_favorites, admin_configuration
from app.version import __version__

# Create main API router
api_router = APIRouter()

# Add version endpoint directly
@api_router.get("/version")
async def api_version():
    """API version endpoint - Returns backend API version"""
    return {
        "version": __version__, 
        "name": "Ansible Builder API"
    }



# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(playbooks.router)
api_router.include_router(admin.router)
api_router.include_router(collections.router)
api_router.include_router(galaxy.router)
api_router.include_router(galaxy_cache.router, prefix="/galaxy", tags=["galaxy-cache"])
api_router.include_router(user_favorites.router)
api_router.include_router(admin_configuration.router)
