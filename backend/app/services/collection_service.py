"""
Collection Service - Parse, generate, and validate requirements.yml files

Supports Ansible requirements.yml format with both collections: and roles: keys.
Entries can be string shorthand or dict entries.
"""

import logging
import re

import yaml

from app.schemas.collection import (
    CollectionRequirement,
    RequirementsData,
    RoleRequirement,
)

logger = logging.getLogger(__name__)


class CollectionService:
    """Parse, generate, and validate Ansible requirements.yml files."""

    def parse(self, content: str) -> tuple[RequirementsData, list[str]]:
        """
        Parse requirements.yml content into structured data.

        Supports:
        - collections: list of string FQCNs or dict entries
        - roles: list of string names or dict entries
        - Top-level list (legacy format, treated as roles)

        Returns:
            Tuple of (RequirementsData, warnings)
        """
        warnings: list[str] = []

        try:
            parsed = yaml.safe_load(content)
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML: {e}")

        if parsed is None:
            return RequirementsData(), ["Empty requirements file"]

        collections: list[CollectionRequirement] = []
        roles: list[RoleRequirement] = []

        if isinstance(parsed, list):
            # Legacy format: top-level list is treated as roles
            warnings.append("Legacy format detected: top-level list treated as roles")
            roles = self._parse_roles_list(parsed, warnings)
        elif isinstance(parsed, dict):
            # Standard format with collections: and/or roles: keys
            if "collections" in parsed:
                raw_collections = parsed["collections"]
                if isinstance(raw_collections, list):
                    collections = self._parse_collections_list(raw_collections, warnings)
                else:
                    warnings.append("'collections' key is not a list, skipping")

            if "roles" in parsed:
                raw_roles = parsed["roles"]
                if isinstance(raw_roles, list):
                    roles = self._parse_roles_list(raw_roles, warnings)
                else:
                    warnings.append("'roles' key is not a list, skipping")

            # Warn about unknown keys
            known_keys = {"collections", "roles"}
            unknown = set(parsed.keys()) - known_keys
            if unknown:
                warnings.append(f"Unknown keys ignored: {', '.join(sorted(unknown))}")
        else:
            raise ValueError("Requirements file must be a YAML dict or list")

        return RequirementsData(collections=collections, roles=roles), warnings

    def _parse_collections_list(
        self, items: list, warnings: list[str]
    ) -> list[CollectionRequirement]:
        """Parse a list of collection entries (string or dict)."""
        results: list[CollectionRequirement] = []
        for i, item in enumerate(items):
            if isinstance(item, str):
                # String shorthand: "namespace.collection" or "namespace.collection:>=1.0.0"
                if ":" in item and not item.startswith("http"):
                    parts = item.split(":", 1)
                    results.append(CollectionRequirement(name=parts[0].strip(), version=parts[1].strip()))
                else:
                    results.append(CollectionRequirement(name=item.strip()))
            elif isinstance(item, dict):
                name = item.get("name")
                if not name:
                    warnings.append(f"Collection entry {i} missing 'name', skipping")
                    continue
                results.append(CollectionRequirement(
                    name=str(name),
                    version=str(item["version"]) if item.get("version") is not None else None,
                    source=str(item["source"]) if item.get("source") else None,
                ))
            else:
                warnings.append(f"Collection entry {i} has unexpected type, skipping")
        return results

    def _parse_roles_list(
        self, items: list, warnings: list[str]
    ) -> list[RoleRequirement]:
        """Parse a list of role entries (string or dict)."""
        results: list[RoleRequirement] = []
        for i, item in enumerate(items):
            if isinstance(item, str):
                results.append(RoleRequirement(name=item.strip()))
            elif isinstance(item, dict):
                # Roles can use 'name' or 'role' as the key
                name = item.get("name") or item.get("role")
                if not name:
                    warnings.append(f"Role entry {i} missing 'name'/'role', skipping")
                    continue
                results.append(RoleRequirement(
                    name=str(name),
                    version=str(item["version"]) if item.get("version") is not None else None,
                    src=str(item["src"]) if item.get("src") else None,
                    scm=str(item["scm"]) if item.get("scm") else None,
                ))
            else:
                warnings.append(f"Role entry {i} has unexpected type, skipping")
        return results

    def generate(self, data: RequirementsData) -> str:
        """
        Generate requirements.yml YAML from structured data.

        Returns valid YAML string.
        """
        output: dict = {}

        if data.collections:
            output["collections"] = []
            for col in data.collections:
                entry: dict = {"name": col.name}
                if col.version:
                    entry["version"] = col.version
                if col.source:
                    entry["source"] = col.source
                output["collections"].append(entry)

        if data.roles:
            output["roles"] = []
            for role in data.roles:
                entry = {"name": role.name}
                if role.version:
                    entry["version"] = role.version
                if role.src:
                    entry["src"] = role.src
                if role.scm:
                    entry["scm"] = role.scm
                output["roles"].append(entry)

        if not output:
            return "---\ncollections: []\nroles: []\n"

        return yaml.dump(output, default_flow_style=False, sort_keys=False)

    def validate(self, data: RequirementsData) -> list[str]:
        """
        Validate requirements data.

        Checks:
        - Duplicate collection names
        - FQCN format for collections (namespace.collection)
        - Duplicate role names
        """
        errors: list[str] = []

        # Check duplicate collections
        seen_collections: set[str] = set()
        for col in data.collections:
            if col.name in seen_collections:
                errors.append(f"Duplicate collection: {col.name}")
            seen_collections.add(col.name)

            # Validate FQCN format
            if not re.match(r"^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$", col.name):
                errors.append(
                    f"Invalid FQCN format for '{col.name}': expected 'namespace.collection'"
                )

        # Check duplicate roles
        seen_roles: set[str] = set()
        for role in data.roles:
            if role.name in seen_roles:
                errors.append(f"Duplicate role: {role.name}")
            seen_roles.add(role.name)

        return errors


# Singleton instance
collection_service = CollectionService()
