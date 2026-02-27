"""
Project schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class ProjectCreate(BaseModel):
    """Schema for project creation"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    git_url: Optional[str] = None
    git_branch: Optional[str] = Field(None, max_length=200)
    git_credentials_id: Optional[str] = None
    settings: Optional[dict] = None


class ProjectUpdate(BaseModel):
    """Schema for project update"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    git_url: Optional[str] = None
    git_branch: Optional[str] = Field(None, max_length=200)
    git_credentials_id: Optional[str] = None
    settings: Optional[dict] = None


class ProjectResponse(BaseModel):
    """Schema for project response"""
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    git_url: Optional[str] = None
    git_branch: Optional[str] = None
    git_credentials_id: Optional[str] = None
    settings: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    # Additional fields for list view
    owner_username: Optional[str] = None
    user_role: Optional[str] = None
    is_shared: bool = False

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema for list of projects"""
    projects: List[ProjectResponse]
    total: int
