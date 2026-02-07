"""
Pydantic schemas for user preferences
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class UserPreferencesBase(BaseModel):
    """Base schema for user preferences"""
    favorite_namespaces: List[str] = Field(default_factory=list, description="List of favorite namespace names")
    interface_settings: Dict[str, Any] = Field(default_factory=dict, description="Interface preferences")
    galaxy_settings: Dict[str, Any] = Field(default_factory=dict, description="Galaxy API preferences")


class UserPreferencesCreate(UserPreferencesBase):
    """Schema for creating user preferences"""
    pass


class UserPreferencesUpdate(BaseModel):
    """Schema for updating user preferences"""
    favorite_namespaces: Optional[List[str]] = Field(None, description="List of favorite namespace names")
    interface_settings: Optional[Dict[str, Any]] = Field(None, description="Interface preferences")
    galaxy_settings: Optional[Dict[str, Any]] = Field(None, description="Galaxy API preferences")


class UserPreferencesResponse(UserPreferencesBase):
    """Schema for user preferences response"""
    id: str = Field(..., description="Preference record ID")
    user_id: str = Field(..., description="User ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


# Specific schemas for namespace favorites
class FavoriteNamespaceRequest(BaseModel):
    """Schema for adding/removing favorite namespace"""
    namespace: str = Field(..., min_length=1, max_length=100, description="Namespace name")


class FavoriteNamespaceResponse(BaseModel):
    """Schema for favorite namespace operation response"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Operation result message")
    favorite_namespaces: List[str] = Field(..., description="Updated list of favorite namespaces")


class InterfaceSettingRequest(BaseModel):
    """Schema for updating interface setting"""
    key: str = Field(..., min_length=1, max_length=50, description="Setting key")
    value: Any = Field(..., description="Setting value")


class InterfaceSettingResponse(BaseModel):
    """Schema for interface setting response"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Operation result message")
    interface_settings: Dict[str, Any] = Field(..., description="Updated interface settings")