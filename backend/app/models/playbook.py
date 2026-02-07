"""
Playbook model for storing user-created playbooks
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class Playbook(Base):
    """
    Playbook model

    Stores complete playbook structure in JSONB format for flexibility.
    Compatible with both SQLite (uses JSON) and PostgreSQL (uses JSONB).

    Attributes:
        id: Unique playbook identifier (UUID)
        name: Playbook name
        description: Optional description
        content: Complete playbook structure (JSON/JSONB)
        owner_id: Foreign key to User
        created_at: Creation timestamp
        updated_at: Last update timestamp
        owner: Relationship to owner User
    """

    __tablename__ = "playbooks"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Complete playbook structure stored as JSON
    # SQLite uses JSON, PostgreSQL can use JSONB for better performance
    content = Column(JSON, nullable=False)

    # Owner relationship
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Version for optimistic locking (incremented on each update)
    version = Column(Integer, default=1, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="playbooks")

    # Cascade delete for shares and audit logs (SQLite doesn't enforce FK constraints by default)
    shares = relationship(
        "PlaybookShare",
        back_populates="playbook",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    audit_logs = relationship(
        "PlaybookAuditLog",
        back_populates="playbook",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def __repr__(self):
        return f"<Playbook {self.name} (id={self.id}, owner={self.owner_id})>"

    def to_dict(self, include_content=True):
        """
        Convert playbook to dictionary

        Args:
            include_content: Include full content in output (default True)

        Returns:
            Dictionary representation of playbook
        """
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "owner_id": self.owner_id,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_content:
            data["content"] = self.content

        return data
