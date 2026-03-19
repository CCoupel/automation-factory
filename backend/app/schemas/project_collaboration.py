"""
Project collaboration schemas for sharing
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProjectShareCreate(BaseModel):
    """Schema for creating a project share"""
    username: str = Field(..., min_length=1, description="Username to share with")
    role: str = Field(default="viewer", description="Role: 'editor' or 'viewer'")


class ProjectShareUpdate(BaseModel):
    """Schema for updating a share role"""
    role: str = Field(..., description="New role: 'editor' or 'viewer'")


class ProjectShareUserInfo(BaseModel):
    """User info included in share responses"""
    id: str
    username: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectShareResponse(BaseModel):
    """Schema for share response"""
    id: str
    project_id: str
    user_id: str
    role: str
    created_at: datetime
    created_by: Optional[str] = None
    user: Optional[ProjectShareUserInfo] = None

    class Config:
        from_attributes = True


class ProjectShareListResponse(BaseModel):
    """Schema for list of shares"""
    project_id: str
    shares: List[ProjectShareResponse]
    total: int
