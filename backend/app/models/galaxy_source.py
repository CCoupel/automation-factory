"""
Galaxy Source model for configurable Galaxy API sources.

Allows administrators to configure multiple Galaxy sources (public and private)
with encrypted token storage and priority ordering.
"""

from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class GalaxySource(Base):
    """
    Galaxy Source configuration model.

    Stores configuration for Galaxy API sources used for role/collection discovery.
    Supports both public Galaxy and private instances (AAP Hub, Galaxy NG).

    Attributes:
        id: Unique identifier (UUID)
        name: Display name (unique)
        source_type: 'public' or 'private'
        url: Base URL of the Galaxy API
        token_encrypted: Fernet-encrypted API token (NULL for public)
        is_active: Whether this source is enabled
        priority: Order priority (lower = higher priority)
        description: Optional description
        last_test_at: Last connection test timestamp
        last_test_status: 'success', 'failed', or 'timeout'
        created_at: Creation timestamp
        updated_at: Last update timestamp
        created_by: FK to user who created this source
        updated_by: FK to user who last updated this source
    """

    __tablename__ = "galaxy_sources"

    # Primary key
    id = Column(String, primary_key=True, default=generate_uuid, index=True)

    # Source identification
    name = Column(String(100), unique=True, nullable=False, index=True)
    source_type = Column(String(20), nullable=False, default="private")  # 'public' or 'private'

    # Connection settings
    url = Column(String(500), nullable=False)
    token_encrypted = Column(Text, nullable=True)  # Fernet encrypted, NULL for public

    # Status and priority
    is_active = Column(Boolean, default=True, nullable=False)
    priority = Column(Integer, default=100, nullable=False, index=True)  # Lower = higher priority

    # Metadata
    description = Column(String(500), nullable=True)
    last_test_at = Column(DateTime, nullable=True)
    last_test_status = Column(String(20), nullable=True)  # 'success', 'failed', 'timeout'

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Audit references
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    updated_by = Column(String, ForeignKey("users.id"), nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="created_galaxy_sources")
    updater = relationship("User", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<GalaxySource {self.name} ({self.source_type})>"

    @property
    def has_token(self) -> bool:
        """Check if a token is configured"""
        return bool(self.token_encrypted)

    def to_dict(self, include_token_masked: bool = False):
        """
        Convert to dictionary representation.

        Args:
            include_token_masked: If True, include masked token for display
        """
        from app.utils.encryption import decrypt_token, mask_token

        result = {
            "id": self.id,
            "name": self.name,
            "source_type": self.source_type,
            "url": self.url,
            "has_token": self.has_token,
            "is_active": self.is_active,
            "priority": self.priority,
            "description": self.description,
            "last_test_at": self.last_test_at.isoformat() if self.last_test_at else None,
            "last_test_status": self.last_test_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by,
        }

        if include_token_masked and self.token_encrypted:
            try:
                decrypted = decrypt_token(self.token_encrypted)
                result["token_masked"] = mask_token(decrypted)
            except Exception:
                result["token_masked"] = "****"
        else:
            result["token_masked"] = None

        return result
