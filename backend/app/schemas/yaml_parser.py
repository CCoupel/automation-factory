"""
Schemas for YAML parser endpoint.
"""

from pydantic import BaseModel, Field


class YamlParseRequest(BaseModel):
    yaml_content: str = Field(..., description="Raw Ansible YAML content to parse")


class YamlParseResponse(BaseModel):
    plays: list[dict] = Field(default_factory=list, description="Parsed plays matching frontend Play[] structure")
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
