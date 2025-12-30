"""
Assertions Service

Generates Ansible assertion blocks for variable validation.
These assertions are system-managed and execute first in pre_tasks.
"""

from typing import List, Dict, Any, Optional


# Type validation expressions for Ansible Jinja2
TYPE_ASSERTIONS = {
    'int': '{var} | int | string == {var} | string',
    'bool': '{var} | bool is boolean',
    'list': '{var} is iterable and {var} is not string and {var} is not mapping',
    'dict': '{var} is mapping',
    # string doesn't need validation - everything is string by default
}

# Builtin type names
BUILTIN_TYPES = {'string', 'int', 'bool', 'list', 'dict'}


def generate_assertions_block(
    variables: List[Dict[str, Any]],
    custom_types: Optional[List[Dict[str, Any]]] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate an Ansible assertion block from playbook variables.

    This block includes:
    1. Default value initialization (for non-required variables with defaults)
    2. Required variable assertions
    3. Type assertions (int, bool, list, dict)
    4. Custom type assertions (based on custom type patterns)
    5. Pattern assertions (regexp validation on variable)

    Args:
        variables: List of variable definitions with keys:
            - key: Variable name
            - value: Current value
            - type: Variable type (string, int, bool, list, dict, or custom)
            - required: Whether the variable is required
            - defaultValue: Default value (optional, for non-required vars)
            - regexp: Validation pattern (optional)
        custom_types: Optional list of custom type definitions with keys:
            - name: Type name
            - label: Display label
            - pattern: Validation pattern (regexp or filter like "| from_json")
            - is_filter: Whether pattern is a filter

    Returns:
        Ansible block structure or None if no variables
    """
    if not variables:
        return None

    tasks = []

    # 1. Set default values for non-required variables with defaults
    default_tasks = _generate_default_value_tasks(variables)
    tasks.extend(default_tasks)

    # 2. Assert required variables are defined
    required_task = _generate_required_assertions(variables)
    if required_task:
        tasks.append(required_task)

    # 3. Assert builtin variable types
    type_task = _generate_type_assertions(variables)
    if type_task:
        tasks.append(type_task)

    # 4. Assert custom variable types
    custom_type_tasks = _generate_custom_type_assertions(variables, custom_types or [])
    tasks.extend(custom_type_tasks)

    # 5. Assert patterns (regexp directly on variable)
    pattern_tasks = _generate_pattern_assertions(variables)
    tasks.extend(pattern_tasks)

    # If no tasks generated, return None
    if not tasks:
        return None

    return {
        'name': 'Variable Assertions',
        'block': tasks,
        'tags': ['always', 'system_assertions']
    }


def _generate_default_value_tasks(variables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate set_fact tasks for default values.

    Only for variables where:
    - required is False
    - defaultValue is defined and not empty
    """
    tasks = []

    for var in variables:
        if not var.get('required') and var.get('defaultValue'):
            key = var['key']
            default_value = var['defaultValue']
            var_type = var.get('type', 'string')

            # Format default value based on type
            formatted_default = _format_default_value(default_value, var_type)

            tasks.append({
                'name': f"Set default for '{key}'",
                'ansible.builtin.set_fact': {
                    key: f"{{{{ {key} | default({formatted_default}) }}}}"
                },
                'when': f"{key} is not defined"
            })

    return tasks


def _format_default_value(value: str, var_type: str) -> str:
    """
    Format a default value for Jinja2 based on variable type.

    Args:
        value: The default value as string
        var_type: The variable type

    Returns:
        Formatted value for Jinja2 expression
    """
    if var_type == 'bool':
        # Convert to lowercase boolean
        return 'true' if value.lower() in ('true', 'yes', '1') else 'false'
    elif var_type == 'int':
        try:
            return str(int(value))
        except (ValueError, TypeError):
            return '0'
    elif var_type == 'list':
        # If it looks like a list, use as-is; otherwise wrap in brackets
        value = value.strip()
        if value.startswith('['):
            return value
        return '[]'
    elif var_type == 'dict':
        # If it looks like a dict, use as-is; otherwise use empty dict
        value = value.strip()
        if value.startswith('{'):
            return value
        return '{}'
    else:
        # String or custom type - quote the value
        # Escape single quotes in the value
        escaped_value = value.replace("'", "\\'")
        return f"'{escaped_value}'"


def _generate_required_assertions(variables: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Generate assertion for required variables.

    Creates a single assert task that checks all required variables are defined.
    """
    required_vars = [v for v in variables if v.get('required')]

    if not required_vars:
        return None

    that_clauses = []
    for var in required_vars:
        key = var['key']
        that_clauses.append(f"{key} is defined")

    var_names = ', '.join(v['key'] for v in required_vars)

    return {
        'name': 'Assert required variables are defined',
        'ansible.builtin.assert': {
            'that': that_clauses,
            'fail_msg': f"Required variables must be defined: {var_names}"
        }
    }


def _generate_type_assertions(variables: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Generate type validation assertions.

    Creates assertions for int, bool, list, dict types.
    String types don't need validation.
    """
    that_clauses = []
    validated_vars = []

    for var in variables:
        key = var['key']
        var_type = var.get('type', 'string')

        # Skip string type - no validation needed
        if var_type == 'string':
            continue

        # Get assertion expression for this type
        assertion_template = TYPE_ASSERTIONS.get(var_type)
        if assertion_template:
            # Format with variable name
            assertion = assertion_template.format(var=key)
            # Only check if variable is defined (for non-required vars)
            if not var.get('required'):
                assertion = f"({key} is not defined) or ({assertion})"
            that_clauses.append(assertion)
            validated_vars.append(f"{key} ({var_type})")

    if not that_clauses:
        return None

    return {
        'name': 'Assert variable types',
        'ansible.builtin.assert': {
            'that': that_clauses,
            'fail_msg': f"Type validation failed for: {', '.join(validated_vars)}"
        }
    }


def _generate_custom_type_assertions(
    variables: List[Dict[str, Any]],
    custom_types: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Generate assertions for custom variable types.

    Creates one assertion per variable with a custom type,
    using the pattern from the custom type definition.
    Also creates conversion tasks for filter-based types.
    """
    tasks = []

    # Create a lookup dict for custom types by name
    custom_type_lookup = {ct['name']: ct for ct in custom_types}

    for var in variables:
        key = var['key']
        var_type = var.get('type', 'string')

        # Skip builtin types
        if var_type in BUILTIN_TYPES:
            continue

        # Look up custom type definition
        custom_type = custom_type_lookup.get(var_type)
        if not custom_type or not custom_type.get('pattern'):
            continue

        pattern = custom_type['pattern']
        label = custom_type.get('label', var_type)
        is_filter = custom_type.get('is_filter', pattern.startswith('|'))

        if is_filter:
            # Filter validation (e.g., '| from_json')
            filter_name = pattern[1:].strip() if pattern.startswith('|') else pattern.strip()
            assertion = f"{key} | {filter_name} is defined"
            description = f"valid {label}"
        else:
            # Regexp validation
            escaped_pattern = pattern.replace("'", "\\'")
            assertion = f"{key} is regex('{escaped_pattern}')"
            description = f"valid {label}"

        # Only check if variable is defined (for non-required vars)
        if not var.get('required'):
            full_assertion = f"({key} is not defined) or ({assertion})"
        else:
            full_assertion = assertion

        # Add assertion task
        tasks.append({
            'name': f"Assert '{key}' is {description}",
            'ansible.builtin.assert': {
                'that': [full_assertion],
                'fail_msg': f"Variable '{key}' must be a valid {label}"
            }
        })

        # Add conversion task for filter-based types
        if is_filter:
            filter_name = pattern[1:].strip() if pattern.startswith('|') else pattern.strip()
            convert_task = {
                'name': f"Convert '{key}' using {filter_name}",
                'ansible.builtin.set_fact': {
                    key: f"{{{{ {key} | {filter_name} }}}}"
                }
            }
            # Add when clause for non-required variables
            if not var.get('required'):
                convert_task['when'] = f"{key} is defined"
            tasks.append(convert_task)

    return tasks


def _generate_pattern_assertions(variables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate pattern (regexp) validation assertions.

    Creates one assertion per variable with a regexp pattern.
    Also creates conversion tasks for filter-based patterns.
    """
    tasks = []

    for var in variables:
        key = var['key']
        pattern = var.get('regexp')

        if not pattern:
            continue

        # Check if pattern is a filter (starts with '|')
        is_filter = pattern.startswith('|')

        if is_filter:
            # Filter validation (e.g., '| from_json')
            filter_name = pattern[1:].strip()
            assertion = f"{key} | {filter_name} is defined"
            description = f"valid {filter_name}"
        else:
            # Regexp validation
            # Escape single quotes in pattern
            escaped_pattern = pattern.replace("'", "\\'")
            assertion = f"{key} is regex('{escaped_pattern}')"
            description = f"pattern {pattern}"

        # Only check if variable is defined (for non-required vars)
        if not var.get('required'):
            full_assertion = f"({key} is not defined) or ({assertion})"
        else:
            full_assertion = assertion

        # Add assertion task
        tasks.append({
            'name': f"Assert '{key}' matches {description}",
            'ansible.builtin.assert': {
                'that': [full_assertion],
                'fail_msg': f"Variable '{key}' does not match {description}"
            }
        })

        # Add conversion task for filter-based patterns
        if is_filter:
            filter_name = pattern[1:].strip()
            convert_task = {
                'name': f"Convert '{key}' using {filter_name}",
                'ansible.builtin.set_fact': {
                    key: f"{{{{ {key} | {filter_name} }}}}"
                }
            }
            # Add when clause for non-required variables
            if not var.get('required'):
                convert_task['when'] = f"{key} is defined"
            tasks.append(convert_task)

    return tasks


def variables_to_dict_format(variables: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Convert PlayVariable list to Ansible vars dict format.

    This is used to generate the 'vars' section of a play.
    Only includes non-required variables with default values,
    or required variables with values set.

    Args:
        variables: List of PlayVariable dicts

    Returns:
        Dictionary for Ansible 'vars' section
    """
    vars_dict = {}

    for var in variables:
        key = var.get('key')
        value = var.get('value')
        var_type = var.get('type', 'string')

        if not key:
            continue

        # Only include if value is set
        if value:
            # Parse value based on type
            parsed_value = _parse_value(value, var_type)
            vars_dict[key] = parsed_value

    return vars_dict


def _parse_value(value: str, var_type: str) -> Any:
    """
    Parse a string value to its appropriate Python type.

    Args:
        value: String value to parse
        var_type: Target type

    Returns:
        Parsed value
    """
    if var_type == 'int':
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0
    elif var_type == 'bool':
        return value.lower() in ('true', 'yes', '1', 'on')
    elif var_type == 'list':
        import json
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass
        return []
    elif var_type == 'dict':
        import json
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass
        return {}
    else:
        # String or custom type
        return value
