"""
Variable Types endpoints for custom variable type management

Provides endpoints for:
- List all variable types (builtin + custom active)
- Validate a value against a type
- Admin CRUD for custom types
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user import User
from app.schemas.variable_type import (
    CustomVariableTypeCreate,
    CustomVariableTypeUpdate,
    CustomVariableTypeResponse,
    BuiltinVariableTypeResponse,
    VariableTypeListResponse,
    ValidateValueRequest,
    ValidateValueResponse,
)
from app.services import variable_type_service


router = APIRouter(prefix="/variable-types", tags=["variable-types"])


@router.get("", response_model=VariableTypeListResponse)
async def list_variable_types(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all available variable types (builtin + custom active)

    Returns:
        VariableTypeListResponse with builtin and custom types
    """
    # Get builtin types
    builtin = [
        BuiltinVariableTypeResponse(**info)
        for info in variable_type_service.BUILTIN_TYPES.values()
    ]

    # Get active custom types
    custom_types = await variable_type_service.get_all_custom_types(db, include_inactive=False)
    custom = [
        CustomVariableTypeResponse(
            id=t.id,
            name=t.name,
            label=t.label,
            description=t.description,
            pattern=t.pattern,
            is_filter=t.is_filter,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at,
            created_by=t.created_by,
        )
        for t in custom_types
    ]

    return VariableTypeListResponse(builtin=builtin, custom=custom)


@router.post("/validate", response_model=ValidateValueResponse)
async def validate_value(
    request: ValidateValueRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a value against a variable type

    Args:
        request: Type name and value to validate

    Returns:
        Validation result with is_valid, message, and parsed_value
    """
    type_name = request.type_name
    value = request.value

    # Check if builtin type
    if type_name in variable_type_service.BUILTIN_TYPES:
        is_valid, message, parsed_value = variable_type_service.validate_builtin_value(
            value, type_name
        )
        return ValidateValueResponse(
            is_valid=is_valid,
            message=message,
            parsed_value=parsed_value
        )

    # Check if custom type
    custom_type = await variable_type_service.get_custom_type_by_name(db, type_name)
    if not custom_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown variable type: {type_name}"
        )

    if not custom_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Variable type is disabled: {type_name}"
        )

    is_valid, message, parsed_value = variable_type_service.validate_value(
        value, custom_type.pattern
    )
    return ValidateValueResponse(
        is_valid=is_valid,
        message=message,
        parsed_value=parsed_value
    )


# ============== Admin Endpoints ==============

@router.get("/admin", response_model=List[CustomVariableTypeResponse])
async def admin_list_custom_types(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all custom variable types including inactive (admin only)

    Returns:
        List of all custom variable types
    """
    custom_types = await variable_type_service.get_all_custom_types(db, include_inactive=True)
    return [
        CustomVariableTypeResponse(
            id=t.id,
            name=t.name,
            label=t.label,
            description=t.description,
            pattern=t.pattern,
            is_filter=t.is_filter,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at,
            created_by=t.created_by,
        )
        for t in custom_types
    ]


@router.post("/admin", response_model=CustomVariableTypeResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_custom_type(
    type_data: CustomVariableTypeCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new custom variable type (admin only)

    Args:
        type_data: Custom type data

    Returns:
        Created custom variable type

    Raises:
        HTTPException 400: If name conflicts with builtin or already exists
    """
    try:
        custom_type = await variable_type_service.create_custom_type(
            db=db,
            name=type_data.name,
            label=type_data.label,
            pattern=type_data.pattern,
            description=type_data.description,
            created_by=current_admin.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return CustomVariableTypeResponse(
        id=custom_type.id,
        name=custom_type.name,
        label=custom_type.label,
        description=custom_type.description,
        pattern=custom_type.pattern,
        is_filter=custom_type.is_filter,
        is_active=custom_type.is_active,
        created_at=custom_type.created_at,
        updated_at=custom_type.updated_at,
        created_by=custom_type.created_by,
    )


@router.put("/admin/{type_id}", response_model=CustomVariableTypeResponse)
async def admin_update_custom_type(
    type_id: str,
    type_data: CustomVariableTypeUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a custom variable type (admin only)

    Args:
        type_id: Custom type UUID
        type_data: Fields to update

    Returns:
        Updated custom variable type

    Raises:
        HTTPException 404: If type not found
    """
    custom_type = await variable_type_service.update_custom_type(
        db=db,
        type_id=type_id,
        label=type_data.label,
        description=type_data.description,
        pattern=type_data.pattern,
        is_active=type_data.is_active
    )

    if not custom_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom variable type not found"
        )

    return CustomVariableTypeResponse(
        id=custom_type.id,
        name=custom_type.name,
        label=custom_type.label,
        description=custom_type.description,
        pattern=custom_type.pattern,
        is_filter=custom_type.is_filter,
        is_active=custom_type.is_active,
        created_at=custom_type.created_at,
        updated_at=custom_type.updated_at,
        created_by=custom_type.created_by,
    )


@router.delete("/admin/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_custom_type(
    type_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a custom variable type (admin only)

    Args:
        type_id: Custom type UUID

    Raises:
        HTTPException 404: If type not found
    """
    deleted = await variable_type_service.delete_custom_type(db, type_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom variable type not found"
        )

    return None
