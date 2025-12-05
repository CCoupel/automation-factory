"""
Main API router that aggregates all endpoint routers
"""

from fastapi import APIRouter
from app.api.endpoints import auth, playbooks, admin, common, collections, galaxy

# Create main API router
api_router = APIRouter()

# Add version endpoint directly
@api_router.get("/version")
async def version():
    """Version endpoint - Returns API version"""
    return {
        "version": "1.4.0_1", 
        "name": "Ansible Builder API"
    }


# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(playbooks.router)
api_router.include_router(admin.router)
api_router.include_router(collections.router)
api_router.include_router(galaxy.router)
