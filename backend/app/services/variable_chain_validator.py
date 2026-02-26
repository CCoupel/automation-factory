"""
Variable Chain Validator

Validates variable flow across roles in a project playbook.
Checks that required arguments are provided, types match, and
referenced variables are set by upstream roles.
"""

import logging
import re
from typing import Any

import yaml
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.project_artifact import ProjectArtifact
from app.schemas.variable_validation import ValidationIssue, VariableChainValidationResponse
from app.services.return_spec_service import ReturnSpecService

logger = logging.getLogger(__name__)

# Regex to extract Jinja2 variable references: {{ var_name }}
JINJA_VAR_RE = re.compile(r"\{\{\s*([a-zA-Z_]\w*)")

return_spec_service = ReturnSpecService()


class VariableChainValidator:
    """Validates variable flow across roles in a project playbook."""

    async def validate(
        self,
        project_id: str,
        playbook_yaml: str,
        db: AsyncSession,
    ) -> VariableChainValidationResponse:
        """Validate variable chains in a playbook.

        1. Parse playbook YAML to find role references (include_role/import_role + play roles:)
        2. For each role ref, fetch argument_specs + return_specs from project artifacts
        3. Validate: required args provided, type compatibility
        4. Scan downstream tasks for {{ var }} references, check they match role outputs
        5. Return issues + resolved role specs
        """
        issues: list[ValidationIssue] = []
        role_specs: dict[str, dict] = {}

        try:
            data = yaml.safe_load(playbook_yaml)
        except yaml.YAMLError as e:
            return VariableChainValidationResponse(
                is_valid=False,
                issues=[ValidationIssue(severity="error", message=f"Invalid YAML: {e}")],
                role_specs={},
            )

        if not isinstance(data, list):
            return VariableChainValidationResponse(
                is_valid=True, issues=[], role_specs={}
            )

        # Collect all outputs from roles (variable name → role name)
        available_outputs: dict[str, str] = {}

        for play in data:
            if not isinstance(play, dict):
                continue

            # Process play-level roles:
            play_roles = play.get("roles", [])
            for role_ref in play_roles:
                role_name = self._extract_role_name(role_ref)
                if not role_name:
                    continue
                role_vars = role_ref.get("vars", {}) if isinstance(role_ref, dict) else {}
                specs = await self._resolve_role_specs(project_id, role_name, db)
                role_specs[role_name] = specs
                self._validate_role_args(role_name, role_vars, specs, issues, module_id=None)
                # Register outputs
                for var_name in specs.get("returns", {}):
                    available_outputs[var_name] = role_name

            # Process tasks in all sections
            for section in ("pre_tasks", "tasks", "post_tasks", "handlers"):
                tasks = play.get(section, [])
                if not isinstance(tasks, list):
                    continue
                await self._process_tasks(
                    project_id, tasks, available_outputs, role_specs, issues, db
                )

        has_errors = any(i.severity == "error" for i in issues)
        return VariableChainValidationResponse(
            is_valid=not has_errors,
            issues=issues,
            role_specs=role_specs,
        )

    async def _process_tasks(
        self,
        project_id: str,
        tasks: list,
        available_outputs: dict[str, str],
        role_specs: dict[str, dict],
        issues: list[ValidationIssue],
        db: AsyncSession,
    ) -> None:
        """Process a list of tasks for role references and variable usage."""
        for task in tasks:
            if not isinstance(task, dict):
                continue

            module_id = task.get("_module_id")

            # Check for include_role / import_role
            for key in ("ansible.builtin.include_role", "include_role",
                        "ansible.builtin.import_role", "import_role"):
                if key in task:
                    role_params = task[key]
                    if isinstance(role_params, dict):
                        role_name = role_params.get("name", "")
                        if role_name:
                            role_vars = task.get("vars", {})
                            specs = await self._resolve_role_specs(project_id, role_name, db)
                            role_specs[role_name] = specs
                            self._validate_role_args(
                                role_name, role_vars, specs, issues, module_id
                            )
                            for var_name in specs.get("returns", {}):
                                available_outputs[var_name] = role_name

            # Check for variable references in task parameters
            jinja_vars = self._extract_jinja_vars(task)
            for var_name in jinja_vars:
                # Skip well-known Ansible vars and registered vars
                if var_name in available_outputs:
                    continue
                # Only warn about variables that look like they should come from roles
                # Skip common Ansible built-ins
                if not self._is_builtin_var(var_name):
                    issues.append(ValidationIssue(
                        severity="warning",
                        message=f"Variable '{var_name}' referenced but not set by any upstream role",
                        module_id=module_id,
                        var_name=var_name,
                    ))

            # Recurse into block/rescue/always
            for section in ("block", "rescue", "always"):
                if section in task and isinstance(task[section], list):
                    await self._process_tasks(
                        project_id, task[section], available_outputs, role_specs, issues, db
                    )

    def _extract_role_name(self, role_ref: Any) -> str | None:
        """Extract role name from a play roles: entry."""
        if isinstance(role_ref, str):
            return role_ref
        if isinstance(role_ref, dict):
            return role_ref.get("role") or role_ref.get("name")
        return None

    def _validate_role_args(
        self,
        role_name: str,
        provided_vars: dict,
        specs: dict,
        issues: list[ValidationIssue],
        module_id: str | None,
    ) -> None:
        """Validate provided variables against role argument_specs."""
        arg_specs = specs.get("args", {})
        if not arg_specs:
            return

        for var_name, var_spec in arg_specs.items():
            is_required = var_spec.get("required", False)
            if is_required and var_name not in provided_vars:
                issues.append(ValidationIssue(
                    severity="error",
                    message=f"Required variable '{var_name}' not provided for role '{role_name}'",
                    module_id=module_id,
                    var_name=var_name,
                    suggestion=f"Add '{var_name}' to the role vars",
                ))

            if var_name in provided_vars:
                expected_type = var_spec.get("type", "any")
                if not self._check_type_compat(expected_type, provided_vars[var_name]):
                    issues.append(ValidationIssue(
                        severity="warning",
                        message=f"Type mismatch: '{var_name}' expects {expected_type} but got {type(provided_vars[var_name]).__name__}",
                        module_id=module_id,
                        var_name=var_name,
                    ))

    def _extract_jinja_vars(self, value: Any) -> set[str]:
        """Regex-extract variable names from any value (str/dict/list)."""
        found: set[str] = set()
        if isinstance(value, str):
            found.update(JINJA_VAR_RE.findall(value))
        elif isinstance(value, dict):
            for v in value.values():
                found.update(self._extract_jinja_vars(v))
        elif isinstance(value, list):
            for item in value:
                found.update(self._extract_jinja_vars(item))
        return found

    def _check_type_compat(self, declared_type: str, value: Any) -> bool:
        """Check if a provided value is compatible with a declared type."""
        if declared_type == "any":
            return True
        # Jinja expressions are always compatible (resolved at runtime)
        if isinstance(value, str) and "{{" in value:
            return True

        type_map = {
            "str": str,
            "int": (int, float),
            "float": (int, float),
            "bool": bool,
            "list": list,
            "dict": dict,
            "path": str,
            "raw": object,
        }
        expected = type_map.get(declared_type)
        if expected is None:
            return True
        # bool is subclass of int in Python, handle explicitly
        if declared_type in ("int", "float") and isinstance(value, bool):
            return False
        return isinstance(value, expected)

    def _is_builtin_var(self, var_name: str) -> bool:
        """Check if a variable name is a well-known Ansible built-in."""
        builtins = {
            "ansible_facts", "ansible_host", "ansible_hostname", "ansible_user",
            "ansible_port", "ansible_connection", "ansible_become", "ansible_become_user",
            "ansible_python_interpreter", "ansible_ssh_host", "ansible_ssh_port",
            "ansible_ssh_user", "ansible_ssh_pass", "ansible_sudo_pass",
            "inventory_hostname", "inventory_hostname_short", "group_names",
            "groups", "hostvars", "play_hosts", "ansible_play_hosts",
            "ansible_play_batch", "ansible_play_name", "ansible_version",
            "ansible_distribution", "ansible_os_family", "ansible_architecture",
            "ansible_env", "ansible_date_time", "ansible_default_ipv4",
            "item", "ansible_loop", "ansible_index_var",
            "omit", "undefined", "true", "false", "none",
        }
        return var_name in builtins

    async def _resolve_role_specs(
        self,
        project_id: str,
        role_name: str,
        db: AsyncSession,
    ) -> dict:
        """Fetch argument_specs + return_specs artifacts for a role in the project."""
        result: dict = {"args": {}, "returns": {}}

        # Look for argument_specs artifact
        arg_query = await db.execute(
            select(ProjectArtifact).where(
                and_(
                    ProjectArtifact.project_id == project_id,
                    ProjectArtifact.artifact_type == "role",
                    ProjectArtifact.path.endswith(f"{role_name}/meta/argument_specs.yml"),
                )
            )
        )
        arg_artifact = arg_query.scalars().first()
        if arg_artifact and arg_artifact.raw_content:
            try:
                arg_data = yaml.safe_load(arg_artifact.raw_content)
                if isinstance(arg_data, dict):
                    # argument_specs format: {argument_specs: {main: {options: {var: {type, ...}}}}}
                    specs = arg_data.get("argument_specs", arg_data)
                    for _entrypoint, ep_data in specs.items():
                        if isinstance(ep_data, dict):
                            options = ep_data.get("options", {})
                            if isinstance(options, dict):
                                result["args"].update(options)
            except yaml.YAMLError:
                pass

        # Look for return_specs artifact
        ret_query = await db.execute(
            select(ProjectArtifact).where(
                and_(
                    ProjectArtifact.project_id == project_id,
                    ProjectArtifact.artifact_type == "role",
                    ProjectArtifact.path.endswith(f"{role_name}/meta/return_specs.yml"),
                )
            )
        )
        ret_artifact = ret_query.scalars().first()
        if ret_artifact and ret_artifact.raw_content:
            parsed = return_spec_service.parse(ret_artifact.raw_content)
            for _entrypoint, ep_data in parsed.items():
                returns = ep_data.get("returns", {})
                result["returns"].update(returns)

        return result
