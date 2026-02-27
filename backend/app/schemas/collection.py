"""
Schemas for Collection/Role requirements management (requirements.yml)
"""

from pydantic import BaseModel, Field


class CollectionRequirement(BaseModel):
    name: str = Field(..., min_length=1)  # FQCN: namespace.collection
    version: str | None = None  # e.g. ">=1.0.0", "==1.2.3", "*"
    source: str | None = None  # Custom Galaxy server URL


class RoleRequirement(BaseModel):
    name: str = Field(..., min_length=1)
    version: str | None = None
    src: str | None = None  # Galaxy name or git URL
    scm: str | None = None  # "git" for git-sourced roles


class RequirementsData(BaseModel):
    collections: list[CollectionRequirement] = []
    roles: list[RoleRequirement] = []


class RequirementsParseRequest(BaseModel):
    raw_content: str = Field(..., min_length=1)


class RequirementsParseResponse(BaseModel):
    data: RequirementsData
    warnings: list[str] = []


class RequirementsGenerateResponse(BaseModel):
    yaml_content: str


class CollectionSearchResult(BaseModel):
    namespace: str
    name: str
    fqcn: str
    version: str
    description: str
    download_count: int | None = None
