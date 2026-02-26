"""
Variable Chain Validation Schemas

Pydantic models for design-time variable flow validation across roles.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ValidationIssue(BaseModel):
    """A single validation issue found during variable chain analysis."""
    severity: str = Field(description="Issue severity: 'error' or 'warning'")
    message: str = Field(description="Human-readable issue description")
    module_id: Optional[str] = Field(None, description="ID of the related module on the canvas")
    var_name: Optional[str] = Field(None, description="Variable name involved")
    suggestion: Optional[str] = Field(None, description="Suggested fix")


class VariableChainValidationRequest(BaseModel):
    """Request body for variable chain validation."""
    playbook_yaml: str = Field(description="Serialized playbook YAML to validate")


class VariableChainValidationResponse(BaseModel):
    """Response from variable chain validation."""
    is_valid: bool = Field(description="True if no errors found (warnings are acceptable)")
    issues: list[ValidationIssue] = Field(default_factory=list)
    role_specs: dict[str, dict] = Field(
        default_factory=dict,
        description="Resolved specs per role: {role_name: {args: {...}, returns: {...}}}",
    )
