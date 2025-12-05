"""
Common API endpoints
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/version")
async def version():
    """
    Version endpoint - Returns API version
    """
    return {
        "version": "1.2.8",
        "name": "Ansible Builder API"
    }


@router.get("/ping")
async def ping():
    """
    Ping endpoint for connectivity tests
    """
    return {"message": "pong"}