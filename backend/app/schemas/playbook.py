"""
Playbook schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class PlaybookBase(BaseModel):
    """Base playbook schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class PlaybookCreate(PlaybookBase):
    """Schema for playbook creation"""
    content: dict = Field(..., description="Complete playbook structure as JSON")


class PlaybookUpdate(BaseModel):
    """Schema for playbook update"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    content: Optional[dict] = None


class PlaybookResponse(PlaybookBase):
    """Schema for playbook response"""
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlaybookDetailResponse(PlaybookResponse):
    """Schema for detailed playbook response (includes content)"""
    content: dict
