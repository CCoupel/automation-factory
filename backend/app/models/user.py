"""
User model for authentication and user management
"""

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class User(Base):
    """
    User model

    Attributes:
        id: Unique user identifier (UUID)
        email: User email (unique, indexed)
        username: User username (unique, indexed)
        hashed_password: Bcrypt hashed password
        is_active: Account active status (can be disabled by admin)
        is_admin: Admin role flag
        created_at: Account creation timestamp
        updated_at: Last update timestamp
        playbooks: Relationship to user's playbooks
    """

    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    playbooks = relationship("Playbook", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username} (id={self.id})>"

    def to_dict(self, include_sensitive=False):
        """
        Convert user to dictionary

        Args:
            include_sensitive: Include hashed_password in output (default False)

        Returns:
            Dictionary representation of user
        """
        data = {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "is_active": self.is_active,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_sensitive:
            data["hashed_password"] = self.hashed_password

        return data
