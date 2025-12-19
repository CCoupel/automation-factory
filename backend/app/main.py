from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.api.router import api_router
from app.version import __version__
from app.services.cache_scheduler_service import cache_scheduler
from app.services.sse_manager import sse_manager

async def create_default_user():
    """Create default admin user for testing if not exists"""
    async with AsyncSessionLocal() as session:
        try:
            # Check if admin user already exists
            result = await session.execute(select(User).where(User.email == "admin@example.com"))
            if result.scalar_one_or_none():
                print("Default admin user already exists")
                return
            
            # Create default admin user with safe password
            try:
                # Use a slightly longer password to avoid bcrypt issues
                safe_password = "admin123"
                hashed_pwd = get_password_hash(safe_password)
                
                admin_user = User(
                    email="admin@example.com",
                    username="admin", 
                    hashed_password=hashed_pwd,
                    is_active=True,
                    is_admin=True
                )
            except Exception as hash_error:
                print(f"Password hashing failed: {hash_error}")
                return
            
            session.add(admin_user)
            await session.commit()
            print("Created default admin user: admin@example.com / admin123")
            
        except Exception as e:
            print(f"Failed to create default user: {e}")
            await session.rollback()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    print(f"Starting Ansible Builder API v{__version__}")
    print(f"Database type: {settings.DATABASE_TYPE}")
    print(f"Database URL: {settings.database_url}")
    
    try:
        await init_db()
        print("Database initialized successfully")
        
        # Create default admin user for testing
        await create_default_user()
        
        # Start Ansible cache scheduler
        print("Starting Ansible cache scheduler...")

        # Connect scheduler to SSE manager for broadcasting notifications
        async def broadcast_notification(notification):
            await sse_manager.broadcast(notification)

        cache_scheduler.register_notification_callback(broadcast_notification)
        await cache_scheduler.start()
        print(f"✅ Cache scheduler started (sync interval: {cache_scheduler.SYNC_INTERVAL_HOURS}h)")
        
    except Exception as e:
        print(f"Database initialization failed: {e}")
    
    yield
    # Shutdown
    print("Shutting down Ansible Builder API")
    await cache_scheduler.stop()
    print("✅ Cache scheduler stopped")

app = FastAPI(
    title="Ansible Builder API",
    description="API for building Ansible playbooks graphically",
    version=__version__,
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router with /api prefix
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Ansible Builder API", "version": "1.3.9_2"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
