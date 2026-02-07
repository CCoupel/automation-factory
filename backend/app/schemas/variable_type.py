"""
Variable Type schemas for request/response validation
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from datetime import datetime
import re


class CustomVariableTypeBase(BaseModel):
    """Base schema for custom variable type"""
    name: str = Field(..., min_length=1, max_length=50, pattern=r'^[a-z][a-z0-9_]*$')
    label: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    pattern: str = Field(..., min_length=1, max_length=500)

    @field_validator('name')
    @classmethod
    def name_must_be_lowercase(cls, v: str) -> str:
        if v != v.lower():
            raise ValueError('name must be lowercase')
        return v

    @field_validator('pattern')
    @classmethod
    def pattern_must_be_valid(cls, v: str) -> str:
        # If it's a filter, just check format
        if v.startswith('|'):
            filter_name = v[1:].strip()
            if not filter_name:
                raise ValueError('filter name cannot be empty')
            return v
        # If it's a regexp, validate it
        try:
            re.compile(v)
        except re.error as e:
            raise ValueError(f'invalid regexp pattern: {e}')
        return v


class CustomVariableTypeCreate(CustomVariableTypeBase):
    """Schema for creating a custom variable type"""
    pass


class CustomVariableTypeUpdate(BaseModel):
    """Schema for updating a custom variable type"""
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    pattern: Optional[str] = Field(None, min_length=1, max_length=500)
    is_active: Optional[bool] = None

    @field_validator('pattern')
    @classmethod
    def pattern_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # If it's a filter, just check format
        if v.startswith('|'):
            filter_name = v[1:].strip()
            if not filter_name:
                raise ValueError('filter name cannot be empty')
            return v
        # If it's a regexp, validate it
        try:
            re.compile(v)
        except re.error as e:
            raise ValueError(f'invalid regexp pattern: {e}')
        return v


class CustomVariableTypeResponse(BaseModel):
    """Schema for custom variable type response"""
    id: str
    name: str
    label: str
    description: Optional[str]
    pattern: str
    is_filter: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: str

    class Config:
        from_attributes = True


class BuiltinVariableTypeResponse(BaseModel):
    """Schema for builtin variable type (string, int, bool, list, dict)"""
    name: str
    label: str
    description: Optional[str] = None
    is_builtin: bool = True


class VariableTypeListResponse(BaseModel):
    """Combined response with both builtin and custom types"""
    builtin: list[BuiltinVariableTypeResponse]
    custom: list[CustomVariableTypeResponse]


class ValidateValueRequest(BaseModel):
    """Schema for value validation request"""
    type_name: str = Field(..., min_length=1)
    value: str


class ValidateValueResponse(BaseModel):
    """Schema for value validation response"""
    is_valid: bool
    message: str
    parsed_value: Optional[Any] = None
