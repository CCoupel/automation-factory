"""
Git import schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from app.schemas.project import ProjectResponse


class GitImportRequest(BaseModel):
    """Schema for git import request"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    git_url: str = Field(..., min_length=1)
    git_branch: str = Field(default="main", max_length=200)
    git_credentials_id: Optional[str] = None


class GitImportArtifactSummary(BaseModel):
    """Summary of a detected artifact"""
    path: str
    artifact_type: str


class GitImportResponse(BaseModel):
    """Schema for git import response"""
    project: ProjectResponse
    artifacts: List[GitImportArtifactSummary]
    warnings: List[str]
