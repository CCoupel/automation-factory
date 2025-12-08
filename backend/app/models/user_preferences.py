"""
User Preferences model for storing user-specific settings
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import json
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class UserPreferences(Base):
    """
    User Preferences model
    
    Stores user-specific preferences and settings including:
    - Favorite namespaces (custom popular list)
    - Interface preferences (theme, layout, etc.)
    - Galaxy API preferences (default filters, etc.)
    
    Attributes:
        id: Unique preference record identifier (UUID)
        user_id: Reference to user (FK)
        favorite_namespaces: JSON list of favorite namespace names
        interface_settings: JSON object with UI preferences
        galaxy_settings: JSON object with Galaxy API preferences
        created_at: Preference creation timestamp
        updated_at: Last update timestamp
        user: Relationship to user
    """

    __tablename__ = "user_preferences"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Galaxy preferences
    favorite_namespaces = Column(JSON, default=list, nullable=False)
    
    # Interface preferences (extensible for future features)
    interface_settings = Column(JSON, default=dict, nullable=False)
    
    # Galaxy API preferences (extensible)
    galaxy_settings = Column(JSON, default=dict, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="preferences")

    def __repr__(self):
        return f"<UserPreferences user_id={self.user_id} (id={self.id})>"

    def to_dict(self):
        """
        Convert preferences to dictionary
        
        Returns:
            Dictionary representation of user preferences
        """
        return {
            "id": self.id,
            "user_id": self.user_id,
            "favorite_namespaces": self.favorite_namespaces or [],
            "interface_settings": self.interface_settings or {},
            "galaxy_settings": self.galaxy_settings or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def add_favorite_namespace(self, namespace: str):
        """
        Add a namespace to favorites
        
        Args:
            namespace: Namespace name to add
        """
        if not self.favorite_namespaces:
            self.favorite_namespaces = []
        
        if namespace not in self.favorite_namespaces:
            self.favorite_namespaces.append(namespace)
            # SQLAlchemy needs explicit flag for JSON changes
            self.favorite_namespaces = self.favorite_namespaces.copy()

    def remove_favorite_namespace(self, namespace: str):
        """
        Remove a namespace from favorites
        
        Args:
            namespace: Namespace name to remove
        """
        if self.favorite_namespaces and namespace in self.favorite_namespaces:
            self.favorite_namespaces.remove(namespace)
            # SQLAlchemy needs explicit flag for JSON changes
            self.favorite_namespaces = self.favorite_namespaces.copy()

    def is_favorite_namespace(self, namespace: str) -> bool:
        """
        Check if a namespace is in favorites
        
        Args:
            namespace: Namespace name to check
            
        Returns:
            True if namespace is in favorites, False otherwise
        """
        return namespace in (self.favorite_namespaces or [])

    def get_favorite_namespaces(self) -> list:
        """
        Get list of favorite namespaces
        
        Returns:
            List of favorite namespace names
        """
        return self.favorite_namespaces or []

    def set_interface_setting(self, key: str, value):
        """
        Set an interface setting
        
        Args:
            key: Setting key
            value: Setting value
        """
        if not self.interface_settings:
            self.interface_settings = {}
        
        self.interface_settings[key] = value
        # SQLAlchemy needs explicit flag for JSON changes
        self.interface_settings = self.interface_settings.copy()

    def get_interface_setting(self, key: str, default=None):
        """
        Get an interface setting
        
        Args:
            key: Setting key
            default: Default value if key not found
            
        Returns:
            Setting value or default
        """
        return (self.interface_settings or {}).get(key, default)