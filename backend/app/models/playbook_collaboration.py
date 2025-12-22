"""
Playbook collaboration models for sharing and audit logging
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class PlaybookRole(str, enum.Enum):
    """Roles for playbook access"""
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class AuditAction(str, enum.Enum):
    """Actions tracked in audit log"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SHARE = "share"
    UNSHARE = "unshare"
    ROLE_CHANGE = "role_change"


class PlaybookShare(Base):
    """
    Playbook sharing model

    Tracks which users have access to which playbooks and their role.

    Attributes:
        id: Unique share identifier (UUID)
        playbook_id: Foreign key to Playbook
        user_id: Foreign key to User (the shared-with user)
        role: Access role (owner, editor, viewer)
        created_at: When the share was created
        created_by: Who created the share (user_id)
    """

    __tablename__ = "playbook_shares"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    playbook_id = Column(String, ForeignKey("playbooks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False, default=PlaybookRole.VIEWER.value)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships - back_populates works with cascade in Playbook model
    playbook = relationship("Playbook", back_populates="shares")
    user = relationship("User", foreign_keys=[user_id], backref="shared_playbooks")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<PlaybookShare playbook={self.playbook_id} user={self.user_id} role={self.role}>"

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "playbook_id": self.playbook_id,
            "user_id": self.user_id,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by
        }


class PlaybookAuditLog(Base):
    """
    Playbook audit log model

    Tracks all modifications to playbooks for history and debugging.

    Attributes:
        id: Unique log entry identifier (UUID)
        playbook_id: Foreign key to Playbook
        user_id: Who performed the action
        action: Type of action (create, update, delete, share, unshare)
        details: JSON details about the change
        created_at: When the action occurred
    """

    __tablename__ = "playbook_audit_log"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    playbook_id = Column(String, ForeignKey("playbooks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String, nullable=False)

    # Details about the change (JSON)
    # For updates: {"field": "name", "old": "...", "new": "..."}
    # For shares: {"shared_with": "user_id", "role": "editor"}
    details = Column(JSON, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships - back_populates works with cascade in Playbook model
    playbook = relationship("Playbook", back_populates="audit_logs")
    user = relationship("User", backref="audit_actions")

    def __repr__(self):
        return f"<PlaybookAuditLog playbook={self.playbook_id} action={self.action} user={self.user_id}>"

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "playbook_id": self.playbook_id,
            "user_id": self.user_id,
            "action": self.action,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
