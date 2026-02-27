"""
Project artifact model for storing project files (roles, inventories, templates, etc.)
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class ArtifactType(str, enum.Enum):
    """Types of artifacts within a project"""
    PLAYBOOK = "playbook"
    ROLE = "role"
    INVENTORY = "inventory"
    COLLECTION_REQUIREMENTS = "collection_requirements"
    VARIABLE_FILE = "variable_file"
    TEMPLATE = "template"
    CUSTOM_MODULE = "custom_module"
    ANSIBLE_CFG = "ansible_cfg"
    FILE = "file"


class ProjectArtifact(Base):
    """
    Project artifact model

    Stores individual files/artifacts within a project.

    Attributes:
        id: Unique identifier (UUID)
        project_id: Foreign key to Project
        artifact_type: Type of artifact (from ArtifactType enum)
        path: Relative path within project
        content: Structured JSON representation (nullable)
        raw_content: Original text content (nullable)
        version: Version counter (incremented on update)
        metadata_: Additional metadata (Python attr, DB column "metadata")
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "project_artifacts"
    __table_args__ = (
        UniqueConstraint("project_id", "path", name="uq_project_artifact_path"),
    )

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_type = Column(String, nullable=False)
    path = Column(String, nullable=False)

    # Content
    content = Column(JSON, nullable=True)
    raw_content = Column(Text, nullable=True)

    # Versioning
    version = Column(Integer, default=1, nullable=False)

    # Metadata (Python attr "metadata_" maps to DB column "metadata" to avoid SQLAlchemy clash)
    metadata_ = Column("metadata", JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="artifacts")

    def __repr__(self):
        return f"<ProjectArtifact {self.path} (type={self.artifact_type}, project={self.project_id})>"

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "artifact_type": self.artifact_type,
            "path": self.path,
            "content": self.content,
            "raw_content": self.raw_content,
            "version": self.version,
            "metadata": self.metadata_,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
