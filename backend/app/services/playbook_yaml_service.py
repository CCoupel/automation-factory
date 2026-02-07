"""
Playbook YAML Service

Converts playbook JSON structure to valid Ansible YAML format.
Provides validation and preview functionality.
"""

import yaml
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from app.services.assertions_service import generate_assertions_block, variables_to_dict_format


@dataclass
class ValidationResult:
    """Result of playbook validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class PlaybookYamlService:
    """
    Service for converting playbook JSON to YAML and validating playbooks.

    The playbook JSON structure follows this format:
    {
        "name": "Playbook name",
        "hosts": "target hosts",
        "become": true/false,
        "become_user": "user",
        "gather_facts": true/false,
        "vars": { ... },
        "vars_files": [...],
        "roles": [...],
        "pre_tasks": [...],
        "tasks": [...],
        "post_tasks": [...],
        "handlers": [...]
    }

    Each task has the structure:
    {
        "name": "Task name",
        "module": "namespace.collection.module",
        "params": { ... },
        "when": "condition",
        "loop": [...],
        "register": "variable_name",
        "ignore_errors": true/false,
        "tags": [...]
    }
    """

    def __init__(self):
        # Configure YAML dumper for Ansible-style output
        self.yaml_dumper = yaml.SafeDumper
        self.yaml_dumper.default_flow_style = False

    def json_to_yaml(
        self,
        playbook_content: Dict[str, Any],
        custom_types: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Convert playbook JSON structure to Ansible YAML format.

        Args:
            playbook_content: Playbook structure as dictionary
            custom_types: Optional list of custom type definitions for assertions

        Returns:
            YAML string formatted for Ansible
        """
        # Build the play structure
        play = self._build_play(playbook_content, custom_types)

        # Wrap in a list (Ansible playbooks are lists of plays)
        playbook = [play]

        # Convert to YAML with proper formatting
        yaml_output = yaml.dump(
            playbook,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            indent=2,
            width=120
        )

        # Add YAML document start marker
        return "---\n" + yaml_output

    def _build_play(
        self,
        content: Dict[str, Any],
        custom_types: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Build a single play structure from JSON content.

        Args:
            content: Play content as dictionary
            custom_types: Optional list of custom type definitions for assertions

        Returns:
            Ansible play structure
        """
        play = {}

        # Required fields
        if "name" in content:
            play["name"] = content["name"]

        if "hosts" in content:
            play["hosts"] = content["hosts"]
        else:
            play["hosts"] = "all"  # Default

        # Optional play-level settings
        if content.get("become"):
            play["become"] = content["become"]

        if content.get("become_user"):
            play["become_user"] = content["become_user"]

        if "gather_facts" in content:
            play["gather_facts"] = content["gather_facts"]

        # Variables - convert from PlayVariable format if available
        if content.get("variables"):
            # New format: list of PlayVariable objects
            vars_dict = variables_to_dict_format(content["variables"])
            if vars_dict:
                play["vars"] = vars_dict
        elif content.get("vars"):
            # Legacy format: direct vars dict
            play["vars"] = content["vars"]

        if content.get("vars_files"):
            play["vars_files"] = content["vars_files"]

        # Roles
        if content.get("roles"):
            play["roles"] = self._build_roles(content["roles"])

        # Pre-tasks section with system assertions block
        pre_tasks = []

        # 1. Generate system assertions block (always first)
        if content.get("variables"):
            assertions_block = generate_assertions_block(content["variables"], custom_types)
            if assertions_block:
                pre_tasks.append(assertions_block)

        # 2. Add user pre_tasks
        if content.get("pre_tasks"):
            user_pre_tasks = self._build_tasks(content["pre_tasks"])
            pre_tasks.extend(user_pre_tasks)

        if pre_tasks:
            play["pre_tasks"] = pre_tasks

        if content.get("tasks"):
            play["tasks"] = self._build_tasks(content["tasks"])

        if content.get("post_tasks"):
            play["post_tasks"] = self._build_tasks(content["post_tasks"])

        # Handlers
        if content.get("handlers"):
            play["handlers"] = self._build_tasks(content["handlers"])

        return play

    def _build_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Build task list from JSON task definitions.

        Args:
            tasks: List of task definitions

        Returns:
            List of Ansible task structures
        """
        ansible_tasks = []

        for task in tasks:
            ansible_task = self._build_task(task)
            if ansible_task:
                ansible_tasks.append(ansible_task)

        return ansible_tasks

    def _build_task(self, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Build a single task structure.

        Args:
            task: Task definition

        Returns:
            Ansible task structure or None if invalid
        """
        # Check if this is a block (no module required)
        is_block = task.get("block") is not None

        # Regular tasks require a module, blocks don't
        if not is_block and not task.get("module"):
            return None

        ansible_task = {}

        # Task name
        if task.get("name"):
            ansible_task["name"] = task["name"]

        # Module and parameters (only for non-block tasks)
        if not is_block and task.get("module"):
            module_name = task["module"]
            params = task.get("params", {})

            # Clean up params - remove empty values
            clean_params = {k: v for k, v in params.items() if v is not None and v != ""}

            if clean_params:
                ansible_task[module_name] = clean_params
            else:
                ansible_task[module_name] = None

        # Task-level options
        if task.get("when"):
            ansible_task["when"] = task["when"]

        if task.get("loop"):
            ansible_task["loop"] = task["loop"]

        if task.get("with_items"):
            ansible_task["with_items"] = task["with_items"]

        if task.get("register"):
            ansible_task["register"] = task["register"]

        if task.get("ignore_errors"):
            ansible_task["ignore_errors"] = task["ignore_errors"]

        if task.get("changed_when"):
            ansible_task["changed_when"] = task["changed_when"]

        if task.get("failed_when"):
            ansible_task["failed_when"] = task["failed_when"]

        if task.get("notify"):
            ansible_task["notify"] = task["notify"]

        if task.get("tags"):
            ansible_task["tags"] = task["tags"]

        if task.get("become") is not None:
            ansible_task["become"] = task["become"]

        if task.get("become_user"):
            ansible_task["become_user"] = task["become_user"]

        if task.get("delegate_to"):
            ansible_task["delegate_to"] = task["delegate_to"]

        if task.get("run_once"):
            ansible_task["run_once"] = task["run_once"]

        # Block support
        if task.get("block"):
            ansible_task["block"] = self._build_tasks(task["block"])
            if task.get("rescue"):
                ansible_task["rescue"] = self._build_tasks(task["rescue"])
            if task.get("always"):
                ansible_task["always"] = self._build_tasks(task["always"])

        return ansible_task

    def _build_roles(self, roles: List[Any]) -> List[Any]:
        """
        Build roles list.

        Args:
            roles: List of role definitions (can be strings or dicts)

        Returns:
            List of role specifications
        """
        ansible_roles = []

        for role in roles:
            if isinstance(role, str):
                ansible_roles.append(role)
            elif isinstance(role, dict):
                # Role with parameters
                ansible_roles.append(role)

        return ansible_roles

    def validate(self, playbook_content: Dict[str, Any]) -> ValidationResult:
        """
        Validate playbook structure.

        Args:
            playbook_content: Playbook structure as dictionary

        Returns:
            ValidationResult with errors and warnings
        """
        errors = []
        warnings = []

        # Check required fields
        if not playbook_content.get("hosts"):
            errors.append("Missing required field: 'hosts'")

        if not playbook_content.get("name"):
            warnings.append("Consider adding a 'name' for the play")

        # Check tasks
        tasks = playbook_content.get("tasks", [])
        if not tasks and not playbook_content.get("roles"):
            warnings.append("Playbook has no tasks or roles defined")

        # Validate each task
        for i, task in enumerate(tasks):
            task_errors, task_warnings = self._validate_task(task, i + 1)
            errors.extend(task_errors)
            warnings.extend(task_warnings)

        # Validate pre_tasks
        for i, task in enumerate(playbook_content.get("pre_tasks", [])):
            task_errors, task_warnings = self._validate_task(task, i + 1, "pre_task")
            errors.extend(task_errors)
            warnings.extend(task_warnings)

        # Validate post_tasks
        for i, task in enumerate(playbook_content.get("post_tasks", [])):
            task_errors, task_warnings = self._validate_task(task, i + 1, "post_task")
            errors.extend(task_errors)
            warnings.extend(task_warnings)

        # Validate handlers
        for i, handler in enumerate(playbook_content.get("handlers", [])):
            handler_errors, handler_warnings = self._validate_task(handler, i + 1, "handler")
            errors.extend(handler_errors)
            warnings.extend(handler_warnings)

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _validate_task(self, task: Dict[str, Any], index: int, task_type: str = "task") -> tuple:
        """
        Validate a single task.

        Args:
            task: Task definition
            index: Task index (1-based)
            task_type: Type of task (task, pre_task, post_task, handler)

        Returns:
            Tuple of (errors, warnings)
        """
        errors = []
        warnings = []
        prefix = f"{task_type.capitalize()} #{index}"

        if not task.get("module"):
            errors.append(f"{prefix}: Missing module specification")

        if not task.get("name"):
            warnings.append(f"{prefix}: Consider adding a 'name' for better readability")

        # Check for common issues
        module = task.get("module", "")
        params = task.get("params", {})

        # Validate module format (should be FQCN)
        if module and "." not in module:
            warnings.append(f"{prefix}: Consider using fully qualified collection name (FQCN) for module '{module}'")

        return errors, warnings


# Singleton instance
playbook_yaml_service = PlaybookYamlService()
