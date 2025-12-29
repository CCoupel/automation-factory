"""
Custom Variable Type model for admin-defined variable validation types
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class CustomVariableType(Base):
    """
    Custom Variable Type model

    Allows administrators to define custom variable types with validation rules.

    Attributes:
        id: Unique identifier (UUID)
        name: Type name (unique, lowercase, ex: 'mail', 'ip', 'json')
        label: Display label (ex: 'Email Address')
        description: Optional description
        pattern: Validation pattern - regexp OR filter (if starts with '|')
                 Examples:
                   - '^[a-z]+@[a-z]+\\.[a-z]+$' (regexp)
                   - '| from_json' (filter)
                   - '| from_yaml' (filter)
        is_active: Whether this type is available for use
        created_at: Creation timestamp
        updated_at: Last update timestamp
        created_by: FK to user who created this type
    """

    __tablename__ = "custom_variable_types"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    label = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    pattern = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Creator reference
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", backref="created_variable_types")

    def __repr__(self):
        return f"<CustomVariableType {self.name} (id={self.id})>"

    @property
    def is_filter(self) -> bool:
        """Check if pattern is a filter (starts with '|')"""
        return self.pattern.startswith('|')

    def to_dict(self):
        """Convert to dictionary representation"""
        return {
            "id": self.id,
            "name": self.name,
            "label": self.label,
            "description": self.description,
            "pattern": self.pattern,
            "is_filter": self.is_filter,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by,
        }
