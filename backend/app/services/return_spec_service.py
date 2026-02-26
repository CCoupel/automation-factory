"""
Return Spec Service

Parses, validates, and infers Ansible role return_specs.yml files.
Follows the Ansible role argument/return specification format.
"""

import logging
from typing import Any

import yaml

logger = logging.getLogger(__name__)

# Valid return spec types
VALID_TYPES = {"str", "int", "bool", "list", "dict", "float", "any", "complex", "raw", "path"}
VALID_SCOPES = {"host", "play", "global"}


class ReturnSpecService:
    """Service for parsing, validating, and inferring role return specifications."""

    def parse(self, yaml_content: str) -> dict:
        """Parse return_specs.yml content into structured dict.

        Args:
            yaml_content: Raw YAML string from return_specs.yml

        Returns:
            Dict with structure: {entrypoint: {short_description, returns: {var: {type, ...}}}}
        """
        try:
            data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            logger.warning("Failed to parse return_specs YAML: %s", e)
            return {}

        if not isinstance(data, dict):
            return {}

        result = {}
        for entrypoint, spec in data.items():
            if not isinstance(spec, dict):
                continue
            entry = {
                "short_description": spec.get("short_description", ""),
                "returns": {},
            }
            returns = spec.get("return_values", spec.get("returns", {}))
            if isinstance(returns, dict):
                for var_name, var_spec in returns.items():
                    if not isinstance(var_spec, dict):
                        continue
                    entry["returns"][var_name] = {
                        "type": var_spec.get("type", "any"),
                        "description": var_spec.get("description", ""),
                        "scope": var_spec.get("scope", "host"),
                        "always_set": var_spec.get("always_set", False),
                        "choices": var_spec.get("choices"),
                        "elements": var_spec.get("elements"),
                        "depends_on": var_spec.get("depends_on"),
                    }
            result[entrypoint] = entry

        return result

    def validate(self, specs: dict) -> list[str]:
        """Validate return_specs structure.

        Args:
            specs: Parsed return specs dict

        Returns:
            List of error messages (empty if valid)
        """
        errors: list[str] = []

        if not isinstance(specs, dict):
            return ["Return specs must be a dictionary"]

        for entrypoint, spec in specs.items():
            if not isinstance(spec, dict):
                errors.append(f"Entrypoint '{entrypoint}' must be a dictionary")
                continue

            returns = spec.get("returns", {})
            if not isinstance(returns, dict):
                errors.append(f"'{entrypoint}.returns' must be a dictionary")
                continue

            for var_name, var_spec in returns.items():
                if not isinstance(var_spec, dict):
                    errors.append(f"'{entrypoint}.returns.{var_name}' must be a dictionary")
                    continue

                var_type = var_spec.get("type", "any")
                if var_type not in VALID_TYPES:
                    errors.append(
                        f"'{entrypoint}.returns.{var_name}.type' invalid: "
                        f"'{var_type}' (valid: {', '.join(sorted(VALID_TYPES))})"
                    )

                scope = var_spec.get("scope", "host")
                if scope not in VALID_SCOPES:
                    errors.append(
                        f"'{entrypoint}.returns.{var_name}.scope' invalid: "
                        f"'{scope}' (valid: {', '.join(sorted(VALID_SCOPES))})"
                    )

                choices = var_spec.get("choices")
                if choices is not None and not isinstance(choices, list):
                    errors.append(f"'{entrypoint}.returns.{var_name}.choices' must be a list")

                depends_on = var_spec.get("depends_on")
                if depends_on is not None and not isinstance(depends_on, list):
                    errors.append(f"'{entrypoint}.returns.{var_name}.depends_on' must be a list")

        return errors

    def infer_from_tasks(self, tasks_yaml: str) -> dict[str, dict[str, Any]]:
        """Scan tasks YAML for set_fact calls, infer potential return specs.

        Args:
            tasks_yaml: Raw YAML string of role tasks

        Returns:
            Dict of {var_name: {type (inferred), scope, always_set}}
        """
        try:
            data = yaml.safe_load(tasks_yaml)
        except yaml.YAMLError:
            return {}

        if not isinstance(data, list):
            return {}

        inferred: dict[str, dict[str, Any]] = {}
        self._scan_tasks(data, inferred)
        return inferred

    def _scan_tasks(self, tasks: list, inferred: dict) -> None:
        """Recursively scan tasks for set_fact modules."""
        for task in tasks:
            if not isinstance(task, dict):
                continue

            # Check for set_fact or ansible.builtin.set_fact
            for key in ("set_fact", "ansible.builtin.set_fact"):
                if key in task:
                    facts = task[key]
                    if isinstance(facts, dict):
                        # Filter out special keys like cacheable
                        for var_name, value in facts.items():
                            if var_name in ("cacheable", "cache_valid_time"):
                                continue
                            inferred[var_name] = {
                                "type": self._infer_type(value),
                                "description": "",
                                "scope": "host",
                                "always_set": not bool(task.get("when")),
                            }

            # Recurse into block/rescue/always
            for section in ("block", "rescue", "always"):
                if section in task and isinstance(task[section], list):
                    self._scan_tasks(task[section], inferred)

            # Recurse into include_tasks results are not scannable,
            # but we still check for inline tasks in loops
            if "tasks" in task and isinstance(task["tasks"], list):
                self._scan_tasks(task["tasks"], inferred)

    def _infer_type(self, value: Any) -> str:
        """Infer Ansible type from a Python value."""
        if isinstance(value, bool):
            return "bool"
        if isinstance(value, int):
            return "int"
        if isinstance(value, float):
            return "float"
        if isinstance(value, list):
            return "list"
        if isinstance(value, dict):
            return "dict"
        # String values may contain Jinja expressions
        return "str"

    def generate_yaml(self, specs: dict) -> str:
        """Generate return_specs.yml YAML from structured dict.

        Args:
            specs: Structured dict with entrypoints and returns

        Returns:
            YAML string
        """
        output = {}
        for entrypoint, spec in specs.items():
            entry: dict[str, Any] = {}
            if spec.get("short_description"):
                entry["short_description"] = spec["short_description"]

            returns = spec.get("returns", {})
            if returns:
                entry["return_values"] = {}
                for var_name, var_spec in returns.items():
                    var_entry: dict[str, Any] = {
                        "type": var_spec.get("type", "any"),
                        "description": var_spec.get("description", ""),
                    }
                    scope = var_spec.get("scope", "host")
                    if scope != "host":
                        var_entry["scope"] = scope
                    if var_spec.get("always_set"):
                        var_entry["always_set"] = True
                    if var_spec.get("choices"):
                        var_entry["choices"] = var_spec["choices"]
                    if var_spec.get("elements"):
                        var_entry["elements"] = var_spec["elements"]
                    if var_spec.get("depends_on"):
                        var_entry["depends_on"] = var_spec["depends_on"]
                    entry["return_values"][var_name] = var_entry

            output[entrypoint] = entry

        return yaml.dump(output, default_flow_style=False, sort_keys=False, allow_unicode=True)
