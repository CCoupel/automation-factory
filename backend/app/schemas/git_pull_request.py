"""
Pydantic schemas for pull request operations.
"""

from pydantic import BaseModel, Field


class CreatePullRequestRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    description: str = Field(default="", max_length=10000)
    target_branch: str = Field(default="main", min_length=1)
    draft: bool = False


class PullRequestInfo(BaseModel):
    number: int
    title: str
    description: str | None = None
    url: str
    status: str  # "open" | "draft" | "closed" | "merged"
    source_branch: str
    target_branch: str
    created_at: str
    provider: str


class PullRequestListResponse(BaseModel):
    pull_requests: list[PullRequestInfo]
