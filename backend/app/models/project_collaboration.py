"""
Project collaboration models for sharing projects with other users
"""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class ProjectRole(str, enum.Enum):
    """Roles for project access"""
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class ProjectShare(Base):
    """
    Project sharing model

    Tracks which users have access to which projects and their role.

    Attributes:
        id: Unique share identifier (UUID)
        project_id: Foreign key to Project
        user_id: Foreign key to User (the shared-with user)
        role: Access role (owner, editor, viewer)
        created_at: When the share was created
        created_by: Who created the share (user_id)
    """

    __tablename__ = "project_shares"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False, default=ProjectRole.VIEWER.value)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="shares")
    user = relationship("User", foreign_keys=[user_id], backref="shared_projects")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<ProjectShare project={self.project_id} user={self.user_id} role={self.role}>"

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by
        }
