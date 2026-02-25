"""
Git credential schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class GitCredentialCreate(BaseModel):
    """Schema for creating a git credential"""
    name: str = Field(..., min_length=1, max_length=100)
    provider: str = Field(default="github", description="Git provider: github, gitlab, bitbucket, custom")
    token: str = Field(..., min_length=1, description="Personal access token")


class GitCredentialUpdate(BaseModel):
    """Schema for updating a git credential"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    provider: Optional[str] = Field(None, description="Git provider")
    token: Optional[str] = Field(None, min_length=1, description="New token (re-encrypted)")


class GitCredentialResponse(BaseModel):
    """Schema for git credential response (never exposes plaintext token)"""
    id: str
    user_id: str
    name: str
    provider: str
    has_token: bool = False
    token_masked: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GitCredentialListResponse(BaseModel):
    """Schema for list of git credentials"""
    credentials: List[GitCredentialResponse]
    total: int
