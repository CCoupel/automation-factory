"""
Playbook schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class PlaybookBase(BaseModel):
    """Base playbook schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class PlaybookCreate(PlaybookBase):
    """Schema for playbook creation"""
    content: dict = Field(..., description="Complete playbook structure as JSON")


class PlaybookUpdate(BaseModel):
    """Schema for playbook update"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    content: Optional[dict] = None


class PlaybookResponse(PlaybookBase):
    """Schema for playbook response"""
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlaybookDetailResponse(PlaybookResponse):
    """Schema for detailed playbook response (includes content)"""
    content: dict


class PlaybookYamlResponse(BaseModel):
    """Schema for YAML generation response"""
    yaml: str = Field(..., description="Generated Ansible YAML")
    playbook_id: Optional[str] = Field(None, description="Playbook ID if from saved playbook")


class PlaybookValidationResponse(BaseModel):
    """Schema for validation response"""
    is_valid: bool = Field(..., description="Whether the playbook is valid")
    errors: list[str] = Field(default_factory=list, description="List of errors")
    warnings: list[str] = Field(default_factory=list, description="List of warnings")
    playbook_id: Optional[str] = Field(None, description="Playbook ID if from saved playbook")


class PlaybookPreviewRequest(BaseModel):
    """Schema for preview request (without saving)"""
    content: dict = Field(..., description="Playbook content to preview")


class LintIssueResponse(BaseModel):
    """Schema for a single lint issue"""
    rule_id: str = Field(..., description="Lint rule identifier")
    rule_description: str = Field(..., description="Description of the rule")
    severity: str = Field(..., description="Severity level (error, warning, info)")
    message: str = Field(..., description="Issue message")
    line: Optional[int] = Field(None, description="Line number")
    column: Optional[int] = Field(None, description="Column number")


class PlaybookLintResponse(BaseModel):
    """Schema for ansible-lint response"""
    is_valid: bool = Field(..., description="No errors found")
    passed: bool = Field(..., description="Lint passed (return code 0)")
    lint_available: bool = Field(..., description="ansible-lint is available")
    error_count: int = Field(default=0, description="Number of errors")
    warning_count: int = Field(default=0, description="Number of warnings")
    info_count: int = Field(default=0, description="Number of info messages")
    issues: list[LintIssueResponse] = Field(default_factory=list, description="List of lint issues")
    playbook_id: Optional[str] = Field(None, description="Playbook ID if from saved playbook")


class FullValidationResponse(BaseModel):
    """Schema for combined syntax-check + lint validation response"""
    # Overall status
    is_valid: bool = Field(..., description="True if syntax OK and no lint errors")

    # Syntax check results
    syntax_valid: bool = Field(..., description="Ansible syntax check passed")
    syntax_error: Optional[str] = Field(None, description="Syntax error message if any")

    # Lint results
    lint_passed: bool = Field(default=True, description="Lint passed (return code 0)")
    lint_available: bool = Field(default=True, description="ansible-lint is available")
    lint_error_count: int = Field(default=0, description="Number of lint errors")
    lint_warning_count: int = Field(default=0, description="Number of lint warnings")
    lint_info_count: int = Field(default=0, description="Number of lint info messages")
    lint_issues: list[LintIssueResponse] = Field(default_factory=list, description="List of lint issues")

    # Version info
    ansible_version: Optional[str] = Field(None, description="Ansible version used for validation")

    # Playbook reference
    playbook_id: Optional[str] = Field(None, description="Playbook ID if from saved playbook")
