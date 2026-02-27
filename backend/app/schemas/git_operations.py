"""
Pydantic schemas for git commit, push, and branch operations.
"""

from pydantic import BaseModel, Field


class GitFileChange(BaseModel):
    path: str
    status: str  # "modified" | "added" | "deleted"


class GitChangesResponse(BaseModel):
    changes: list[GitFileChange]
    branch: str
    has_remote: bool


class GitCommitRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


class GitCommitResponse(BaseModel):
    commit_sha: str
    message: str
    files_changed: int


class GitPushResponse(BaseModel):
    pushed: bool
    branch: str
    commit_sha: str


class GitBranchInfo(BaseModel):
    name: str
    is_current: bool
    is_remote: bool


class GitBranchListResponse(BaseModel):
    branches: list[GitBranchInfo]
    current: str


class GitBranchCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9._/-]+$')


class GitBranchSwitchRequest(BaseModel):
    name: str = Field(..., min_length=1)


class GitBranchSwitchResponse(BaseModel):
    branch: str
    artifacts_imported: int
    warnings: list[str] = []
