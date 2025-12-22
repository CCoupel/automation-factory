"""
Collaboration schemas for playbook sharing and audit logging
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# === Share Schemas ===

class ShareCreate(BaseModel):
    """Schema for creating a playbook share"""
    username: str = Field(..., min_length=1, description="Username to share with")
    role: str = Field(default="viewer", description="Role: 'editor' or 'viewer'")


class ShareUpdate(BaseModel):
    """Schema for updating a share role"""
    role: str = Field(..., description="New role: 'editor' or 'viewer'")


class ShareUserInfo(BaseModel):
    """User info included in share responses"""
    id: str
    username: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ShareResponse(BaseModel):
    """Schema for share response"""
    id: str
    playbook_id: str
    user_id: str
    role: str
    created_at: datetime
    created_by: Optional[str] = None
    user: Optional[ShareUserInfo] = None

    class Config:
        from_attributes = True


class ShareListResponse(BaseModel):
    """Schema for list of shares"""
    playbook_id: str
    shares: List[ShareResponse]
    total: int


# === Audit Log Schemas ===

class AuditLogUserInfo(BaseModel):
    """User info for audit log entries"""
    id: str
    username: str

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    """Schema for audit log entry"""
    id: str
    playbook_id: str
    user_id: Optional[str] = None
    action: str
    details: Optional[dict] = None
    created_at: datetime
    user: Optional[AuditLogUserInfo] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Schema for list of audit log entries"""
    playbook_id: str
    entries: List[AuditLogResponse]
    total: int


# === Shared Playbook Response ===

class SharedPlaybookResponse(BaseModel):
    """Schema for playbook in shared-with-me list"""
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    owner_username: str
    role: str  # User's role in this playbook
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SharedPlaybooksListResponse(BaseModel):
    """Schema for list of playbooks shared with user"""
    playbooks: List[SharedPlaybookResponse]
    total: int


# === Presence Schemas ===

class ConnectedUserResponse(BaseModel):
    """Schema for a connected user in a playbook room"""
    user_id: str
    username: str
    connected_at: str


class PresenceResponse(BaseModel):
    """Schema for presence in a playbook"""
    playbook_id: str
    users: List[ConnectedUserResponse]
    count: int
