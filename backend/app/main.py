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
from app.services.galaxy_cache_service import galaxy_cache_service

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
        
        # Start Galaxy data synchronization in background (DISABLED to avoid API rate limits)
        # print("Starting Galaxy cache synchronization...")
        # import asyncio
        # asyncio.create_task(galaxy_cache_service.startup_full_sync())
        print("Galaxy cache synchronization DISABLED to avoid rate limits")
        
    except Exception as e:
        print(f"Database initialization failed: {e}")
    
    yield
    # Shutdown
    print("Shutting down Ansible Builder API")

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
