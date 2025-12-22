"""
Playbook CRUD endpoints

Provides endpoints for managing playbooks:
- List user's playbooks
- Create new playbook
- Get playbook details
- Update playbook
- Delete playbook
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.playbook import Playbook
from app.schemas.playbook import (
    PlaybookCreate, PlaybookUpdate, PlaybookResponse, PlaybookDetailResponse,
    PlaybookYamlResponse, PlaybookValidationResponse, PlaybookPreviewRequest,
    PlaybookLintResponse, LintIssueResponse, FullValidationResponse
)
from app.services.playbook_yaml_service import playbook_yaml_service
from app.services.ansible_lint_service import ansible_lint_service

router = APIRouter(prefix="/playbooks", tags=["playbooks"])


@router.get("", response_model=List[PlaybookResponse])
async def list_playbooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all playbooks for the authenticated user

    Returns:
        List of playbooks (without full content)
    """
    result = await db.execute(
        select(Playbook)
        .where(Playbook.owner_id == current_user.id)
        .order_by(Playbook.updated_at.desc())
    )
    playbooks = result.scalars().all()

    return playbooks


@router.post("", response_model=PlaybookDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_playbook(
    playbook_data: PlaybookCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new playbook

    Args:
        playbook_data: Playbook creation data (name, description, content)

    Returns:
        Created playbook with full details
    """
    # Create playbook
    playbook = Playbook(
        name=playbook_data.name,
        description=playbook_data.description,
        content=playbook_data.content,
        owner_id=current_user.id
    )

    db.add(playbook)
    await db.commit()
    await db.refresh(playbook)

    return playbook


@router.get("/{playbook_id}", response_model=PlaybookDetailResponse)
async def get_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific playbook with full content

    Args:
        playbook_id: Playbook ID

    Returns:
        Playbook with full content

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    # Verify ownership
    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    return playbook


@router.put("/{playbook_id}", response_model=PlaybookDetailResponse)
async def update_playbook(
    playbook_id: str,
    playbook_data: PlaybookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a playbook

    Args:
        playbook_id: Playbook ID
        playbook_data: Fields to update (name, description, content)

    Returns:
        Updated playbook

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    # Verify ownership
    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this playbook"
        )

    # Update fields
    if playbook_data.name is not None:
        playbook.name = playbook_data.name
    if playbook_data.description is not None:
        playbook.description = playbook_data.description
    if playbook_data.content is not None:
        playbook.content = playbook_data.content

    await db.commit()
    await db.refresh(playbook)

    return playbook


@router.delete("/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a playbook

    Args:
        playbook_id: Playbook ID

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    # Verify ownership
    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this playbook"
        )

    await db.delete(playbook)
    await db.commit()

    return None


@router.get("/{playbook_id}/yaml", response_model=PlaybookYamlResponse)
async def get_playbook_yaml(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get generated YAML for a playbook

    Args:
        playbook_id: Playbook ID

    Returns:
        Generated YAML string

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    yaml_output = playbook_yaml_service.json_to_yaml(playbook.content)

    return PlaybookYamlResponse(
        yaml=yaml_output,
        playbook_id=playbook_id
    )


@router.post("/{playbook_id}/validate", response_model=PlaybookValidationResponse)
async def validate_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a saved playbook

    Args:
        playbook_id: Playbook ID

    Returns:
        Validation result with errors and warnings

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    validation = playbook_yaml_service.validate(playbook.content)

    return PlaybookValidationResponse(
        is_valid=validation.is_valid,
        errors=validation.errors,
        warnings=validation.warnings,
        playbook_id=playbook_id
    )


@router.post("/preview", response_model=PlaybookYamlResponse)
async def preview_playbook(
    preview_data: PlaybookPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate YAML preview without saving

    This endpoint is used for real-time preview in the frontend.
    It does not require a saved playbook.

    Args:
        preview_data: Playbook content to preview

    Returns:
        Generated YAML string
    """
    yaml_output = playbook_yaml_service.json_to_yaml(preview_data.content)

    return PlaybookYamlResponse(
        yaml=yaml_output,
        playbook_id=None
    )


@router.post("/validate-preview", response_model=PlaybookValidationResponse)
async def validate_preview(
    preview_data: PlaybookPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Validate playbook content without saving

    This endpoint is used for real-time validation in the frontend.
    It does not require a saved playbook.

    Args:
        preview_data: Playbook content to validate

    Returns:
        Validation result with errors and warnings
    """
    validation = playbook_yaml_service.validate(preview_data.content)

    return PlaybookValidationResponse(
        is_valid=validation.is_valid,
        errors=validation.errors,
        warnings=validation.warnings,
        playbook_id=None
    )


@router.post("/{playbook_id}/lint", response_model=PlaybookLintResponse)
async def lint_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Run ansible-lint on a saved playbook

    Args:
        playbook_id: Playbook ID

    Returns:
        Lint result with issues

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    # Generate YAML and run ansible-lint
    yaml_content = playbook_yaml_service.json_to_yaml(playbook.content)
    lint_result = ansible_lint_service.lint_yaml(yaml_content)

    return PlaybookLintResponse(
        is_valid=lint_result.is_valid,
        passed=lint_result.passed,
        lint_available=lint_result.lint_available,
        error_count=lint_result.error_count,
        warning_count=lint_result.warning_count,
        info_count=lint_result.info_count,
        issues=[
            LintIssueResponse(
                rule_id=issue.rule_id,
                rule_description=issue.rule_description,
                severity=issue.severity.value,
                message=issue.message,
                line=issue.line,
                column=issue.column
            )
            for issue in lint_result.issues
        ],
        playbook_id=playbook_id
    )


@router.post("/lint-preview", response_model=PlaybookLintResponse)
async def lint_preview(
    preview_data: PlaybookPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Run ansible-lint on playbook content without saving

    This endpoint is used for real-time linting in the frontend.
    It does not require a saved playbook.

    Args:
        preview_data: Playbook content to lint

    Returns:
        Lint result with issues
    """
    # Generate YAML and run ansible-lint
    yaml_content = playbook_yaml_service.json_to_yaml(preview_data.content)
    lint_result = ansible_lint_service.lint_yaml(yaml_content)

    return PlaybookLintResponse(
        is_valid=lint_result.is_valid,
        passed=lint_result.passed,
        lint_available=lint_result.lint_available,
        error_count=lint_result.error_count,
        warning_count=lint_result.warning_count,
        info_count=lint_result.info_count,
        issues=[
            LintIssueResponse(
                rule_id=issue.rule_id,
                rule_description=issue.rule_description,
                severity=issue.severity.value,
                message=issue.message,
                line=issue.line,
                column=issue.column
            )
            for issue in lint_result.issues
        ],
        playbook_id=None
    )


@router.post("/validate-full-preview", response_model=FullValidationResponse)
async def validate_full_preview(
    preview_data: PlaybookPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Run full validation (syntax-check + lint) on playbook content without saving.

    This endpoint combines ansible-playbook --syntax-check and ansible-lint
    for comprehensive validation. It returns:
    - Syntax validation result
    - Lint issues (errors, warnings, info)
    - Ansible version used for validation

    Args:
        preview_data: Playbook content to validate

    Returns:
        Full validation result with syntax and lint results
    """
    # Generate YAML and run full validation
    yaml_content = playbook_yaml_service.json_to_yaml(preview_data.content)
    validation_result = ansible_lint_service.validate(yaml_content)

    return FullValidationResponse(
        is_valid=validation_result.is_valid,
        syntax_valid=validation_result.syntax_valid,
        syntax_error=validation_result.syntax_error,
        lint_passed=validation_result.lint_passed,
        lint_available=validation_result.lint_available,
        lint_error_count=validation_result.lint_error_count,
        lint_warning_count=validation_result.lint_warning_count,
        lint_info_count=validation_result.lint_info_count,
        lint_issues=[
            LintIssueResponse(
                rule_id=issue.rule_id,
                rule_description=issue.rule_description,
                severity=issue.severity.value,
                message=issue.message,
                line=issue.line,
                column=issue.column
            )
            for issue in validation_result.lint_issues
        ],
        ansible_version=validation_result.ansible_version,
        playbook_id=None
    )


@router.post("/{playbook_id}/validate-full", response_model=FullValidationResponse)
async def validate_full_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Run full validation (syntax-check + lint) on a saved playbook.

    Args:
        playbook_id: Playbook ID

    Returns:
        Full validation result with syntax and lint results

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    # Generate YAML and run full validation
    yaml_content = playbook_yaml_service.json_to_yaml(playbook.content)
    validation_result = ansible_lint_service.validate(yaml_content)

    return FullValidationResponse(
        is_valid=validation_result.is_valid,
        syntax_valid=validation_result.syntax_valid,
        syntax_error=validation_result.syntax_error,
        lint_passed=validation_result.lint_passed,
        lint_available=validation_result.lint_available,
        lint_error_count=validation_result.lint_error_count,
        lint_warning_count=validation_result.lint_warning_count,
        lint_info_count=validation_result.lint_info_count,
        lint_issues=[
            LintIssueResponse(
                rule_id=issue.rule_id,
                rule_description=issue.rule_description,
                severity=issue.severity.value,
                message=issue.message,
                line=issue.line,
                column=issue.column
            )
            for issue in validation_result.lint_issues
        ],
        ansible_version=validation_result.ansible_version,
        playbook_id=playbook_id
    )
