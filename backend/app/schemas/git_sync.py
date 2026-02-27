"""
Pydantic schemas for git sync and conflict resolution.
"""

from enum import IntEnum

from pydantic import BaseModel, Field


class ConflictLevel(IntEnum):
    ONE_SIDE_ONLY = 0
    DIFFERENT_SECTIONS = 1
    COMPATIBLE_ADDS = 2
    TRUE_CONFLICT = 3


class FileSyncStatus(BaseModel):
    path: str
    artifact_type: str
    level: int
    auto_merged: bool
    merged_content: str | None = None
    base_content: str | None = None
    local_content: str | None = None
    remote_content: str | None = None
    structural_diff: dict | None = None


class GitSyncResponse(BaseModel):
    status: str  # "up_to_date" | "fast_forward" | "auto_merged" | "conflicts"
    auto_merged_files: list[FileSyncStatus] = []
    conflicted_files: list[FileSyncStatus] = []
    remote_ahead_by: int = 0
    local_ahead_by: int = 0


class FileResolution(BaseModel):
    path: str
    resolution: str  # "ours" | "theirs" | "custom"
    custom_content: str | None = None


class ConflictResolveRequest(BaseModel):
    resolutions: list[FileResolution]
    commit_message: str = Field(default="Merge remote changes", max_length=500)
    auto_push: bool = False


class ConflictResolveResponse(BaseModel):
    commit_sha: str
    files_resolved: int
    pushed: bool = False
