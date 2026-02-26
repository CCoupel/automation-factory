"""
Project artifact schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class ProjectArtifactCreate(BaseModel):
    """Schema for artifact creation"""
    artifact_type: str = Field(..., description="Artifact type (playbook, role, inventory, etc.)")
    path: str = Field(..., min_length=1, max_length=500, description="Relative path within project")
    content: Optional[dict] = Field(None, description="Structured JSON representation")
    raw_content: Optional[str] = Field(None, description="Original text content")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


class ProjectArtifactUpdate(BaseModel):
    """Schema for artifact update"""
    artifact_type: Optional[str] = Field(None, description="Artifact type")
    path: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[dict] = None
    raw_content: Optional[str] = None
    metadata: Optional[dict] = None


class ProjectArtifactResponse(BaseModel):
    """Schema for artifact response"""
    id: str
    project_id: str
    artifact_type: str
    path: str
    content: Optional[dict] = None
    raw_content: Optional[str] = None
    version: int = 1
    metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectArtifactListResponse(BaseModel):
    """Schema for list of artifacts"""
    project_id: str
    artifacts: List[ProjectArtifactResponse]
    total: int
