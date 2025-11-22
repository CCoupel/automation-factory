"""
Main API router that aggregates all endpoint routers
"""

from fastapi import APIRouter
from app.api.endpoints import auth, playbooks, admin

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(playbooks.router)
api_router.include_router(admin.router)
