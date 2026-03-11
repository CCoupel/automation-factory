"""
Project model for grouping playbooks and artifacts
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class Project(Base):
    """
    Project model

    Groups playbooks and artifacts (roles, inventories, templates, etc.)
    under a single umbrella. Foundation for Git import and project navigation.

    Attributes:
        id: Unique identifier (UUID)
        name: Project name
        description: Optional description
        owner_id: Foreign key to User
        git_url: Optional Git repository URL
        git_branch: Git branch (default "main")
        git_credentials_id: Optional FK to GitCredential
        settings: Optional JSON settings (ansible.cfg equiv)
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Owner relationship
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Git integration
    git_url = Column(String, nullable=True)
    git_branch = Column(String, nullable=True, default="main")
    git_credentials_id = Column(String, ForeignKey("git_credentials.id", ondelete="SET NULL"), nullable=True, index=True)

    # Project settings (ansible.cfg equiv)
    settings = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="projects")
    git_credential = relationship("GitCredential")

    artifacts = relationship(
        "ProjectArtifact",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    shares = relationship(
        "ProjectShare",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    playbooks = relationship(
        "Playbook",
        back_populates="project"
    )

    def __repr__(self):
        return f"<Project {self.name} (id={self.id}, owner={self.owner_id})>"

    def to_dict(self):
        """Convert project to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "owner_id": self.owner_id,
            "git_url": self.git_url,
            "git_branch": self.git_branch,
            "git_credentials_id": self.git_credentials_id,
            "settings": self.settings,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
