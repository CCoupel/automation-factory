"""
Return Spec Schemas

Pydantic models for Ansible role return specifications.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ReturnSpecEntry(BaseModel):
    """A single return specification entry."""
    type: str = Field("any", description="Value type (str, int, bool, list, dict, float, any)")
    description: str = Field("", description="Description of the returned variable")
    scope: str = Field("host", description="Variable scope (host, play, global)")
    always_set: bool = Field(False, description="Whether the variable is always set")
    choices: Optional[list[str]] = Field(None, description="Valid choices for the value")
    elements: Optional[str] = Field(None, description="Element type for list values")
    depends_on: Optional[list[str]] = Field(None, description="Variables this depends on")


class ReturnSpecResponse(BaseModel):
    """Response for parsed return specs."""
    entrypoint: str
    short_description: Optional[str] = None
    returns: dict[str, ReturnSpecEntry]


class InferredReturnSpecResponse(BaseModel):
    """Response for inferred return specs from task scanning."""
    inferred: dict[str, ReturnSpecEntry]
    warnings: list[str]
