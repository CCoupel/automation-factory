"""
Database initialization script

Creates database tables and first admin user.

Usage:
    python init_db.py [--email ADMIN_EMAIL] [--username ADMIN_USERNAME] [--password ADMIN_PASSWORD]

If credentials are not provided, defaults will be used:
    - Email: admin@example.com
    - Username: admin
    - Password: admin123 (CHANGE THIS IN PRODUCTION!)
"""

import asyncio
import argparse
from sqlalchemy import select

from app.core.database import init_db, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User


async def create_admin_user(email: str, username: str, password: str):
    """
    Create the first admin user

    Args:
        email: Admin email
        username: Admin username
        password: Admin password
    """
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"[WARNING] User with email '{email}' already exists")
            print(f"   Username: {existing_user.username}")
            print(f"   Is Admin: {existing_user.is_admin}")
            return

        # Create admin user
        admin = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_admin=True
        )

        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        print(f"[SUCCESS] Admin user created successfully!")
        print(f"   Email: {admin.email}")
        print(f"   Username: {admin.username}")
        print(f"   ID: {admin.id}")
        print(f"\n[IMPORTANT] Please change the default password immediately!")


async def main():
    """
    Main initialization function
    """
    parser = argparse.ArgumentParser(description="Initialize Ansible Builder database")
    parser.add_argument(
        "--email",
        type=str,
        default="admin@example.com",
        help="Admin email (default: admin@example.com)"
    )
    parser.add_argument(
        "--username",
        type=str,
        default="admin",
        help="Admin username (default: admin)"
    )
    parser.add_argument(
        "--password",
        type=str,
        default="admin123",
        help="Admin password (default: admin123)"
    )

    args = parser.parse_args()

    print("[INIT] Initializing Ansible Builder database...")

    # Initialize database tables
    await init_db()
    print("[SUCCESS] Database tables created")

    # Create admin user
    await create_admin_user(args.email, args.username, args.password)

    print("\n[COMPLETE] Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())
