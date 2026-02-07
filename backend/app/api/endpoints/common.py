"""
Common API endpoints
"""

from fastapi import APIRouter
from app.version import get_version_info

router = APIRouter()


@router.get("/version")
async def version():
    """
    Version endpoint - Returns complete API version information including features
    """
    version_info = get_version_info()
    return {
        "version": version_info["version"],
        "base_version": version_info["base_version"],
        "internal_version": version_info["internal_version"],
        "environment": version_info["environment"],
        "name": "Automation Factory API",
        "description": version_info["description"],
        "is_rc": version_info["is_rc"],
        "features": version_info["features"]
    }


@router.get("/ping")
async def ping():
    """
    Ping endpoint for connectivity tests
    """
    return {"message": "pong"}