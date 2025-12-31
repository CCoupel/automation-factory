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
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.playbook import Playbook
from app.models.playbook_collaboration import PlaybookShare, PlaybookAuditLog, PlaybookRole, AuditAction
from pydantic import BaseModel
from app.schemas.playbook import (
    PlaybookCreate, PlaybookUpdate, PlaybookResponse, PlaybookDetailResponse,
    PlaybookYamlResponse, PlaybookValidationResponse, PlaybookPreviewRequest,
    PlaybookLintResponse, LintIssueResponse, FullValidationResponse,
    PlaybookTransferOwnershipRequest, PlaybookTransferOwnershipResponse
)
from app.services.playbook_yaml_service import playbook_yaml_service
from app.services.ansible_lint_service import ansible_lint_service
from app.services.variable_type_service import get_all_custom_types
from app.services.playbook_access_service import (
    check_playbook_access,
    log_playbook_action
)

router = APIRouter(prefix="/playbooks", tags=["playbooks"])


@router.get("", response_model=List[PlaybookResponse])
async def list_playbooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all playbooks for the authenticated user

    Includes:
    - Playbooks owned by the user (user_role='owner', is_shared=False)
    - Playbooks shared with the user (user_role='editor'|'viewer', is_shared=True)

    Returns:
        List of playbooks with owner info and user's role
    """
    result_list = []

    # Get playbooks owned by the user
    owned_result = await db.execute(
        select(Playbook)
        .where(Playbook.owner_id == current_user.id)
    )
    owned_playbooks = list(owned_result.scalars().all())

    # Get share info for owned playbooks
    for playbook in owned_playbooks:
        # Get users this playbook is shared with
        shares_result = await db.execute(
            select(PlaybookShare, User)
            .join(User, User.id == PlaybookShare.user_id)
            .where(PlaybookShare.playbook_id == playbook.id)
        )
        shares = shares_result.all()
        shared_usernames = [user.username for _, user in shares]

        result_list.append({
            "id": playbook.id,
            "name": playbook.name,
            "description": playbook.description,
            "owner_id": playbook.owner_id,
            "version": playbook.version,
            "created_at": playbook.created_at,
            "updated_at": playbook.updated_at,
            "owner_username": current_user.username,
            "user_role": PlaybookRole.OWNER.value,
            "is_shared": False,
            "shared_with_count": len(shared_usernames),
            "shared_with_users": shared_usernames if shared_usernames else None
        })

    # Get playbooks shared with the user (with owner info and role)
    shared_result = await db.execute(
        select(Playbook, PlaybookShare, User)
        .join(PlaybookShare, PlaybookShare.playbook_id == Playbook.id)
        .join(User, User.id == Playbook.owner_id)
        .where(PlaybookShare.user_id == current_user.id)
    )
    for playbook, share, owner in shared_result.all():
        result_list.append({
            "id": playbook.id,
            "name": playbook.name,
            "description": playbook.description,
            "owner_id": playbook.owner_id,
            "version": playbook.version,
            "created_at": playbook.created_at,
            "updated_at": playbook.updated_at,
            "owner_username": owner.username,
            "user_role": share.role,
            "is_shared": True
        })

    # Sort by updated_at descending
    result_list.sort(key=lambda p: p["updated_at"], reverse=True)

    return result_list


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
    await db.flush()  # Get the playbook ID

    # Log audit action
    await log_playbook_action(
        db, playbook.id, current_user.id, AuditAction.CREATE,
        {"name": playbook.name}
    )

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

    Accessible by owner or any user with share access.

    Args:
        playbook_id: Playbook ID

    Returns:
        Playbook with full content

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not authorized to access this playbook
    """
    playbook, role = await check_playbook_access(playbook_id, current_user.id, db)
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

    Accessible by owner or users with 'editor' role.

    Args:
        playbook_id: Playbook ID
        playbook_data: Fields to update (name, description, content)

    Returns:
        Updated playbook

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not authorized or insufficient role
    """
    # Check access with editor role requirement
    playbook, role = await check_playbook_access(
        playbook_id, current_user.id, db,
        required_role=PlaybookRole.EDITOR.value
    )

    # Track changes for audit log
    changes = {}

    # Update fields
    if playbook_data.name is not None and playbook_data.name != playbook.name:
        changes["name"] = {"old": playbook.name, "new": playbook_data.name}
        playbook.name = playbook_data.name
    if playbook_data.description is not None and playbook_data.description != playbook.description:
        changes["description"] = {"old": playbook.description, "new": playbook_data.description}
        playbook.description = playbook_data.description
    if playbook_data.content is not None:
        changes["content"] = True  # Don't store full content in audit log
        playbook.content = playbook_data.content

    # Increment version for optimistic locking
    if changes:
        playbook.version += 1

        # Log audit action
        await log_playbook_action(
            db, playbook_id, current_user.id, AuditAction.UPDATE,
            {"changes": list(changes.keys()), "new_version": playbook.version}
        )

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


@router.post("/{playbook_id}/transfer-ownership", response_model=PlaybookTransferOwnershipResponse)
async def transfer_playbook_ownership(
    playbook_id: str,
    transfer_data: PlaybookTransferOwnershipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Transfer playbook ownership to another user.

    Only the current owner can transfer ownership.
    The new owner must be a user the playbook is currently shared with.

    Args:
        playbook_id: Playbook ID
        transfer_data: New owner username and whether to keep access for old owner

    Returns:
        Transfer result

    Raises:
        HTTPException 404: Playbook not found or new owner not found
        HTTPException 403: Not the owner of this playbook
        HTTPException 400: New owner is not a shared user
    """
    # Get the playbook
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    # Verify current user is the owner
    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can transfer ownership"
        )

    # Find the new owner by username
    new_owner_result = await db.execute(
        select(User).where(User.username == transfer_data.new_owner_username)
    )
    new_owner = new_owner_result.scalar_one_or_none()

    if not new_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{transfer_data.new_owner_username}' not found"
        )

    # Verify new owner is a shared user (not the current owner)
    if new_owner.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer ownership to yourself"
        )

    share_result = await db.execute(
        select(PlaybookShare).where(
            and_(
                PlaybookShare.playbook_id == playbook_id,
                PlaybookShare.user_id == new_owner.id
            )
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{transfer_data.new_owner_username}' is not a shared user of this playbook"
        )

    # Transfer ownership
    old_owner_id = playbook.owner_id
    playbook.owner_id = new_owner.id

    # Remove share entry for new owner (they're now the owner)
    await db.delete(share)

    # Optionally add share entry for old owner
    old_owner_kept_access = False
    if transfer_data.keep_access:
        new_share = PlaybookShare(
            playbook_id=playbook_id,
            user_id=old_owner_id,
            role=PlaybookRole.EDITOR.value,
            created_by=new_owner.id
        )
        db.add(new_share)
        old_owner_kept_access = True

    # Log audit action
    await log_playbook_action(
        db, playbook_id, current_user.id, AuditAction.UPDATE,
        {
            "action": "transfer_ownership",
            "old_owner_id": old_owner_id,
            "new_owner_id": new_owner.id,
            "new_owner_username": new_owner.username,
            "old_owner_kept_access": old_owner_kept_access
        }
    )

    await db.commit()

    return PlaybookTransferOwnershipResponse(
        success=True,
        new_owner_username=new_owner.username,
        old_owner_kept_access=old_owner_kept_access
    )


@router.get("/{playbook_id}/yaml", response_model=PlaybookYamlResponse)
async def get_playbook_yaml(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get generated YAML for a playbook

    Accessible by owner or any user with share access.

    Args:
        playbook_id: Playbook ID

    Returns:
        Generated YAML string

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not authorized
    """
    playbook, role = await check_playbook_access(playbook_id, current_user.id, db)

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

    Accessible by owner or any user with share access.

    Args:
        playbook_id: Playbook ID

    Returns:
        Validation result with errors and warnings

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not authorized
    """
    playbook, role = await check_playbook_access(playbook_id, current_user.id, db)

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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
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
    # Fetch custom types for assertions
    custom_types_db = await get_all_custom_types(db)
    custom_types = [
        {
            'name': ct.name,
            'label': ct.label,
            'pattern': ct.pattern,
            'is_filter': ct.is_filter
        }
        for ct in custom_types_db
    ]

    yaml_output = playbook_yaml_service.json_to_yaml(preview_data.content, custom_types)

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

    Accessible by owner or any user with share access.

    Args:
        playbook_id: Playbook ID

    Returns:
        Lint result with issues

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not authorized
    """
    playbook, role = await check_playbook_access(playbook_id, current_user.id, db)

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

    Accessible by owner or any user with share access.

    Args:
        playbook_id: Playbook ID

    Returns:
        Full validation result with syntax and lint results

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not authorized
    """
    playbook, role = await check_playbook_access(playbook_id, current_user.id, db)

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
