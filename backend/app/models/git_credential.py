"""
Git credential model for storing encrypted repository access tokens
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class GitProvider(str, enum.Enum):
    """Supported Git providers"""
    GITHUB = "github"
    GITLAB = "gitlab"
    BITBUCKET = "bitbucket"
    CUSTOM = "custom"


class GitCredential(Base):
    """
    Git credential model

    Stores encrypted tokens for Git repository access.
    Tokens are encrypted via Fernet (app.utils.encryption).

    Attributes:
        id: Unique identifier (UUID)
        user_id: Owner of this credential
        name: Human-readable name
        provider: Git provider (github, gitlab, bitbucket, custom)
        token_encrypted: Fernet-encrypted token
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "git_credentials"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    provider = Column(String(20), nullable=False, default=GitProvider.GITHUB.value)
    token_encrypted = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="git_credentials")

    def __repr__(self):
        return f"<GitCredential {self.name} (id={self.id}, provider={self.provider})>"

    def to_dict(self):
        """Convert to dictionary (never includes token)"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "provider": self.provider,
            "has_token": bool(self.token_encrypted),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
