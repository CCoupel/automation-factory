"""
FastAPI main application

Entry point for the Ansible Builder backend API.
Provides REST endpoints for:
- User authentication and management
- Playbook CRUD operations
- Admin user management
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup/shutdown events

    Startup:
        - Initialize database tables

    Shutdown:
        - Clean up resources
    """
    # Startup
    print("[STARTUP] Starting Ansible Builder API...")
    print(f"[DATABASE] Using {settings.DATABASE_TYPE.upper()}")

    # Initialize database
    await init_db()
    print("[SUCCESS] Database initialized")

    yield

    # Shutdown
    print("[SHUTDOWN] Shutting down Ansible Builder API...")


# Create FastAPI application
app = FastAPI(
    title="Ansible Builder API",
    description="REST API for Ansible playbook visual builder",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - Must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include API router
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """
    Root endpoint - API info
    """
    return {
        "name": "Ansible Builder API",
        "version": "1.0.0",
        "status": "running",
        "database": settings.DATABASE_TYPE
    }


@app.get("/health")
async def health():
    """
    Health check endpoint
    """
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
