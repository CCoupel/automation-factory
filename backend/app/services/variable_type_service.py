"""
Variable Type Service for validation and management of custom variable types
"""

import re
import json
import yaml
from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.custom_variable_type import CustomVariableType


# Builtin types that cannot be overridden
BUILTIN_TYPES = {
    'string': {
        'name': 'string',
        'label': 'String',
        'description': 'Text value'
    },
    'int': {
        'name': 'int',
        'label': 'Integer',
        'description': 'Whole number'
    },
    'bool': {
        'name': 'bool',
        'label': 'Boolean',
        'description': 'True or False'
    },
    'list': {
        'name': 'list',
        'label': 'List',
        'description': 'Array of values'
    },
    'dict': {
        'name': 'dict',
        'label': 'Dictionary',
        'description': 'Key-value pairs'
    }
}


# Supported filters for validation
SUPPORTED_FILTERS = {
    'from_json': lambda v: json.loads(v),
    'from_yaml': lambda v: yaml.safe_load(v),
}


def validate_value(value: str, pattern: str) -> tuple[bool, str, Any]:
    """
    Validate a value against a pattern.

    Args:
        value: The value to validate
        pattern: Regexp pattern OR filter (if starts with '|')

    Returns:
        Tuple of (is_valid, message, parsed_value)
    """
    if pattern.startswith('|'):
        # Filter validation
        filter_name = pattern[1:].strip()
        if filter_name not in SUPPORTED_FILTERS:
            return False, f"Unknown filter: {filter_name}", None
        try:
            parsed = SUPPORTED_FILTERS[filter_name](value)
            return True, "Validation successful", parsed
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON: {str(e)}", None
        except yaml.YAMLError as e:
            return False, f"Invalid YAML: {str(e)}", None
        except Exception as e:
            return False, f"Validation error: {str(e)}", None
    else:
        # Regexp validation
        try:
            if re.fullmatch(pattern, value):
                return True, "Match", value
            return False, "Invalid format", None
        except re.error as e:
            return False, f"Invalid regexp: {str(e)}", None


def validate_builtin_value(value: str, type_name: str) -> tuple[bool, str, Any]:
    """
    Validate a value against a builtin type.

    Args:
        value: The value to validate
        type_name: Builtin type name (string, int, bool, list, dict)

    Returns:
        Tuple of (is_valid, message, parsed_value)
    """
    if type_name == 'string':
        return True, "Valid string", value

    elif type_name == 'int':
        try:
            parsed = int(value)
            return True, "Valid integer", parsed
        except ValueError:
            return False, "Not a valid integer", None

    elif type_name == 'bool':
        lower = value.lower()
        if lower in ('true', 'yes', '1'):
            return True, "Valid boolean", True
        elif lower in ('false', 'no', '0'):
            return True, "Valid boolean", False
        else:
            return False, "Not a valid boolean (use true/false, yes/no, or 1/0)", None

    elif type_name == 'list':
        # Try to parse as JSON or YAML list
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return True, "Valid list", parsed
            return False, "Value is not a list", None
        except json.JSONDecodeError:
            try:
                parsed = yaml.safe_load(value)
                if isinstance(parsed, list):
                    return True, "Valid list", parsed
                return False, "Value is not a list", None
            except yaml.YAMLError:
                return False, "Cannot parse as list (use JSON or YAML syntax)", None

    elif type_name == 'dict':
        # Try to parse as JSON or YAML dict
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return True, "Valid dictionary", parsed
            return False, "Value is not a dictionary", None
        except json.JSONDecodeError:
            try:
                parsed = yaml.safe_load(value)
                if isinstance(parsed, dict):
                    return True, "Valid dictionary", parsed
                return False, "Value is not a dictionary", None
            except yaml.YAMLError:
                return False, "Cannot parse as dictionary (use JSON or YAML syntax)", None

    return False, f"Unknown builtin type: {type_name}", None


async def get_all_custom_types(
    db: AsyncSession,
    include_inactive: bool = False
) -> list[CustomVariableType]:
    """
    Get all custom variable types.

    Args:
        db: Database session
        include_inactive: Include inactive types (for admin)

    Returns:
        List of CustomVariableType
    """
    query = select(CustomVariableType)
    if not include_inactive:
        query = query.where(CustomVariableType.is_active == True)
    query = query.order_by(CustomVariableType.name)

    result = await db.execute(query)
    return result.scalars().all()


async def get_custom_type_by_name(
    db: AsyncSession,
    name: str
) -> Optional[CustomVariableType]:
    """
    Get a custom variable type by name.

    Args:
        db: Database session
        name: Type name

    Returns:
        CustomVariableType or None
    """
    query = select(CustomVariableType).where(CustomVariableType.name == name)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_custom_type_by_id(
    db: AsyncSession,
    type_id: str
) -> Optional[CustomVariableType]:
    """
    Get a custom variable type by ID.

    Args:
        db: Database session
        type_id: Type UUID

    Returns:
        CustomVariableType or None
    """
    query = select(CustomVariableType).where(CustomVariableType.id == type_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_custom_type(
    db: AsyncSession,
    name: str,
    label: str,
    pattern: str,
    created_by: str,
    description: Optional[str] = None
) -> CustomVariableType:
    """
    Create a new custom variable type.

    Args:
        db: Database session
        name: Type name (unique, lowercase)
        label: Display label
        pattern: Validation pattern (regexp or filter)
        created_by: User ID who created this type
        description: Optional description

    Returns:
        Created CustomVariableType

    Raises:
        ValueError: If name conflicts with builtin type or already exists
    """
    # Check if name conflicts with builtin
    if name in BUILTIN_TYPES:
        raise ValueError(f"Cannot override builtin type: {name}")

    # Check if name already exists
    existing = await get_custom_type_by_name(db, name)
    if existing:
        raise ValueError(f"Type already exists: {name}")

    custom_type = CustomVariableType(
        name=name,
        label=label,
        description=description,
        pattern=pattern,
        created_by=created_by
    )

    db.add(custom_type)
    await db.commit()
    await db.refresh(custom_type)

    return custom_type


async def update_custom_type(
    db: AsyncSession,
    type_id: str,
    label: Optional[str] = None,
    description: Optional[str] = None,
    pattern: Optional[str] = None,
    is_active: Optional[bool] = None
) -> Optional[CustomVariableType]:
    """
    Update a custom variable type.

    Args:
        db: Database session
        type_id: Type UUID
        label: New label (optional)
        description: New description (optional)
        pattern: New pattern (optional)
        is_active: New active status (optional)

    Returns:
        Updated CustomVariableType or None if not found
    """
    custom_type = await get_custom_type_by_id(db, type_id)
    if not custom_type:
        return None

    if label is not None:
        custom_type.label = label
    if description is not None:
        custom_type.description = description
    if pattern is not None:
        custom_type.pattern = pattern
    if is_active is not None:
        custom_type.is_active = is_active

    await db.commit()
    await db.refresh(custom_type)

    return custom_type


async def delete_custom_type(
    db: AsyncSession,
    type_id: str
) -> bool:
    """
    Delete a custom variable type.

    Args:
        db: Database session
        type_id: Type UUID

    Returns:
        True if deleted, False if not found
    """
    custom_type = await get_custom_type_by_id(db, type_id)
    if not custom_type:
        return False

    await db.delete(custom_type)
    await db.commit()

    return True
