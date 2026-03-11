"""
Inventory schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Any, Optional


class InventoryHost(BaseModel):
    """A host in an Ansible inventory"""
    name: str = Field(..., min_length=1)
    variables: dict[str, Any] = {}


class InventoryGroup(BaseModel):
    """A group in an Ansible inventory"""
    name: str = Field(..., min_length=1)
    hosts: list[str] = []
    children: list[str] = []
    variables: dict[str, Any] = {}


class InventoryData(BaseModel):
    """Structured inventory data (hosts + groups)"""
    hosts: list[InventoryHost] = []
    groups: list[InventoryGroup] = []


class InventoryParseRequest(BaseModel):
    """Request to parse raw inventory content"""
    raw_content: str = Field(..., min_length=1)


class InventoryParseResponse(BaseModel):
    """Response from parsing inventory content"""
    data: InventoryData
    warnings: list[str] = []
    format: str  # 'yaml' | 'ini'


class InventoryGenerateResponse(BaseModel):
    """Response from generating YAML inventory"""
    yaml_content: str
