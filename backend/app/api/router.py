"""
Main API router that aggregates all endpoint routers

Note: Legacy Galaxy endpoints (/api/galaxy/*) have been removed.
      Use /api/ansible/* endpoints for Ansible documentation data.
"""

from fastapi import APIRouter
from app.api.endpoints import auth, playbooks, admin, common, user_favorites, admin_configuration, ansible, collaboration
from app.version import __version__

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(playbooks.router)
api_router.include_router(admin.router)
api_router.include_router(common.router)
api_router.include_router(user_favorites.router)
api_router.include_router(admin_configuration.router)
api_router.include_router(ansible.router)  # Ansible documentation API
api_router.include_router(collaboration.router)  # Playbook sharing and collaboration
