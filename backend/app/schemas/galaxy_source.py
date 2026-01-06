"""
Galaxy Source schemas for request/response validation.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re


class GalaxySourceBase(BaseModel):
    """Base schema for Galaxy source."""
    name: str = Field(..., min_length=1, max_length=100, description="Display name")
    url: str = Field(..., min_length=1, max_length=500, description="Galaxy API base URL")
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = Field(default=True)
    priority: int = Field(default=100, ge=0)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r'^[a-zA-Z0-9_\-\s\(\)]+$', v):
            raise ValueError('Name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses')
        return v

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip().rstrip('/')
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class GalaxySourceCreate(GalaxySourceBase):
    """Schema for creating a Galaxy source."""
    source_type: str = Field(default="private", pattern="^(public|private)$")
    token: Optional[str] = Field(None, min_length=1, description="API token (required for private)")

    @field_validator('token')
    @classmethod
    def validate_token(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip()
        return v


class GalaxySourceUpdate(BaseModel):
    """Schema for updating a Galaxy source."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0)
    token: Optional[str] = Field(None, description="New token (omit to keep existing)")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not re.match(r'^[a-zA-Z0-9_\-\s\(\)]+$', v):
                raise ValueError('Name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses')
        return v

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().rstrip('/')
            if not v.startswith(('http://', 'https://')):
                raise ValueError('URL must start with http:// or https://')
        return v

    @field_validator('token')
    @classmethod
    def validate_token(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip()
        return v


class GalaxySourceResponse(BaseModel):
    """Schema for Galaxy source response."""
    id: str
    name: str
    source_type: str
    url: str
    description: Optional[str] = None
    is_active: bool
    priority: int
    has_token: bool = Field(description="Whether a token is configured")
    token_masked: Optional[str] = Field(None, description="Masked token for display")
    last_test_at: Optional[datetime] = None
    last_test_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: str

    class Config:
        from_attributes = True


class GalaxySourceListResponse(BaseModel):
    """Response for listing Galaxy sources."""
    sources: List[GalaxySourceResponse]
    total: int


class GalaxySourceReorderRequest(BaseModel):
    """Request to reorder Galaxy sources."""
    source_ids: List[str] = Field(..., min_length=1, description="Ordered list of source IDs")


class GalaxySourceTestResponse(BaseModel):
    """Response from testing a Galaxy source connection."""
    success: bool
    message: str
    response_time_ms: Optional[int] = None
    api_version: Optional[str] = None
    collections_count: Optional[int] = None


class GalaxySourceTestRequest(BaseModel):
    """Request to test a Galaxy source (for testing before save)."""
    url: str
    token: Optional[str] = None
    source_type: str = Field(default="private", pattern="^(public|private)$")

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip().rstrip('/')
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v
