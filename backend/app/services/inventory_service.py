"""
Service for parsing, validating, and generating Ansible inventory files.

Supports YAML and INI inventory formats.
"""

import re

import yaml

from app.schemas.inventory import InventoryData, InventoryHost, InventoryGroup


class InventoryService:
    """Parses and generates Ansible inventory files."""

    def parse_yaml(self, content: str) -> tuple[InventoryData, list[str]]:
        """Parse YAML inventory into structured host/group data.

        Supports standard Ansible YAML inventory format:
            all:
              hosts:
                host1:
                  ansible_host: 1.2.3.4
              children:
                webservers:
                  hosts:
                    web1:
                  vars:
                    http_port: 80

        Returns (InventoryData, warnings).
        """
        warnings: list[str] = []
        hosts_map: dict[str, dict] = {}
        groups: list[InventoryGroup] = []

        parsed = yaml.safe_load(content)
        if not isinstance(parsed, dict):
            raise ValueError("YAML inventory must be a mapping at the top level")

        # The top-level key is typically "all", but could be any group name
        for group_name, group_data in parsed.items():
            self._parse_yaml_group(
                group_name, group_data, hosts_map, groups, warnings
            )

        hosts = [
            InventoryHost(name=name, variables=vars_)
            for name, vars_ in hosts_map.items()
        ]
        return InventoryData(hosts=hosts, groups=groups), warnings

    def _parse_yaml_group(
        self,
        name: str,
        data: dict | None,
        hosts_map: dict[str, dict],
        groups: list[InventoryGroup],
        warnings: list[str],
    ) -> None:
        """Recursively parse a YAML group definition."""
        if data is None:
            groups.append(InventoryGroup(name=name))
            return

        if not isinstance(data, dict):
            warnings.append(f"Group '{name}' has invalid format, skipping")
            return

        group_hosts: list[str] = []
        group_children: list[str] = []
        group_vars: dict = {}

        # Parse hosts
        if "hosts" in data and isinstance(data["hosts"], dict):
            for host_name, host_vars in data["hosts"].items():
                host_vars = host_vars if isinstance(host_vars, dict) else {}
                # Merge into global hosts map
                if host_name in hosts_map:
                    hosts_map[host_name].update(host_vars)
                else:
                    hosts_map[host_name] = dict(host_vars)
                group_hosts.append(str(host_name))

        # Parse group vars
        if "vars" in data and isinstance(data["vars"], dict):
            group_vars = dict(data["vars"])

        # Parse children recursively
        if "children" in data and isinstance(data["children"], dict):
            for child_name, child_data in data["children"].items():
                group_children.append(child_name)
                self._parse_yaml_group(
                    child_name, child_data, hosts_map, groups, warnings
                )

        groups.append(InventoryGroup(
            name=name,
            hosts=group_hosts,
            children=group_children,
            variables=group_vars,
        ))

    def parse_ini(self, content: str) -> tuple[InventoryData, list[str]]:
        """Parse INI-style inventory into structured host/group data.

        Supports:
            host1 ansible_host=1.2.3.4
            [webservers]
            web1
            web2
            [webservers:vars]
            http_port=80
            [webservers:children]
            subgroup1

        Returns (InventoryData, warnings).
        """
        warnings: list[str] = []
        hosts_map: dict[str, dict] = {}
        groups_map: dict[str, InventoryGroup] = {}
        current_section: str | None = None
        section_type: str = "hosts"  # 'hosts' | 'vars' | 'children'

        for line_no, raw_line in enumerate(content.splitlines(), 1):
            line = raw_line.strip()

            # Skip empty lines and comments
            if not line or line.startswith("#") or line.startswith(";"):
                continue

            # Section header
            section_match = re.match(r"^\[(.+)\]$", line)
            if section_match:
                section_content = section_match.group(1)
                if ":vars" in section_content:
                    current_section = section_content.replace(":vars", "")
                    section_type = "vars"
                elif ":children" in section_content:
                    current_section = section_content.replace(":children", "")
                    section_type = "children"
                else:
                    current_section = section_content
                    section_type = "hosts"
                # Ensure group exists
                if current_section not in groups_map:
                    groups_map[current_section] = InventoryGroup(name=current_section)
                continue

            # Content lines
            if current_section is None:
                # Ungrouped hosts (before any section)
                host_name, host_vars = self._parse_ini_host_line(line)
                if host_name:
                    if host_name in hosts_map:
                        hosts_map[host_name].update(host_vars)
                    else:
                        hosts_map[host_name] = host_vars
                continue

            if section_type == "hosts":
                host_name, host_vars = self._parse_ini_host_line(line)
                if host_name:
                    if host_name in hosts_map:
                        hosts_map[host_name].update(host_vars)
                    else:
                        hosts_map[host_name] = host_vars
                    if host_name not in groups_map[current_section].hosts:
                        groups_map[current_section].hosts.append(host_name)
            elif section_type == "vars":
                key, value = self._parse_ini_var_line(line)
                if key:
                    groups_map[current_section].variables[key] = value
            elif section_type == "children":
                child_name = line.strip()
                if child_name and child_name not in groups_map[current_section].children:
                    groups_map[current_section].children.append(child_name)
                    # Ensure child group exists
                    if child_name not in groups_map:
                        groups_map[child_name] = InventoryGroup(name=child_name)

        hosts = [
            InventoryHost(name=name, variables=vars_)
            for name, vars_ in hosts_map.items()
        ]
        groups = list(groups_map.values())
        return InventoryData(hosts=hosts, groups=groups), warnings

    def _parse_ini_host_line(self, line: str) -> tuple[str | None, dict]:
        """Parse a host line from INI inventory.

        Format: hostname key1=val1 key2=val2
        """
        parts = line.split()
        if not parts:
            return None, {}
        host_name = parts[0]
        variables: dict = {}
        for part in parts[1:]:
            if "=" in part:
                key, value = part.split("=", 1)
                variables[key] = self._coerce_ini_value(value)
        return host_name, variables

    def _parse_ini_var_line(self, line: str) -> tuple[str | None, str | None]:
        """Parse a variable line (key=value)."""
        if "=" not in line:
            return None, None
        key, value = line.split("=", 1)
        return key.strip(), self._coerce_ini_value(value.strip())

    def _coerce_ini_value(self, value: str):
        """Try to coerce INI string values to appropriate Python types."""
        # Boolean
        if value.lower() in ("true", "yes"):
            return True
        if value.lower() in ("false", "no"):
            return False
        # Integer
        try:
            return int(value)
        except ValueError:
            pass
        # Float
        try:
            return float(value)
        except ValueError:
            pass
        return value

    def detect_format(self, content: str) -> str:
        """Detect whether content is YAML or INI format.

        Returns 'yaml' or 'ini'.
        """
        stripped = content.strip()
        # If it starts with typical YAML markers or has mapping-like structure
        if stripped.startswith("---") or stripped.startswith("all:"):
            return "yaml"
        # Try YAML parse
        try:
            parsed = yaml.safe_load(stripped)
            if isinstance(parsed, dict):
                # If all top-level values are dicts or None, likely YAML inventory
                if all(
                    isinstance(v, (dict, type(None)))
                    for v in parsed.values()
                ):
                    return "yaml"
        except yaml.YAMLError:
            pass
        return "ini"

    def parse(self, content: str) -> tuple[InventoryData, list[str], str]:
        """Auto-detect format and parse inventory content.

        Returns (InventoryData, warnings, format).
        """
        fmt = self.detect_format(content)
        if fmt == "yaml":
            data, warnings = self.parse_yaml(content)
        else:
            data, warnings = self.parse_ini(content)
        return data, warnings, fmt

    def generate_yaml(self, data: InventoryData) -> str:
        """Generate YAML inventory from structured data."""
        # Build the inventory structure
        inventory: dict = {"all": {"hosts": {}, "children": {}}}

        # Find top-level groups (groups that are not children of any other group)
        all_children = set()
        groups_by_name = {g.name: g for g in data.groups}
        for group in data.groups:
            all_children.update(group.children)

        # Add hosts to "all" group
        hosts_dict: dict = {}
        for host in data.hosts:
            hosts_dict[host.name] = host.variables if host.variables else None
        inventory["all"]["hosts"] = hosts_dict

        # Build children groups
        for group in data.groups:
            if group.name == "all":
                # Merge into the top-level "all"
                if group.variables:
                    inventory["all"]["vars"] = group.variables
                continue

            group_dict: dict = {}
            if group.hosts:
                group_dict["hosts"] = {
                    h: None for h in group.hosts
                }
            if group.variables:
                group_dict["vars"] = group.variables
            if group.children:
                group_dict["children"] = {
                    c: None for c in group.children
                }
            inventory["all"]["children"][group.name] = group_dict or None

        # Clean up empty sections
        if not inventory["all"]["hosts"]:
            del inventory["all"]["hosts"]
        if not inventory["all"]["children"]:
            del inventory["all"]["children"]

        return yaml.dump(inventory, default_flow_style=False, sort_keys=False)

    def validate(self, data: InventoryData) -> list[str]:
        """Validate inventory structure, return list of errors."""
        errors: list[str] = []
        host_names = {h.name for h in data.hosts}
        group_names = {g.name for g in data.groups}

        # Check for duplicate host names
        seen_hosts: set[str] = set()
        for host in data.hosts:
            if host.name in seen_hosts:
                errors.append(f"Duplicate host name: '{host.name}'")
            seen_hosts.add(host.name)

        # Check for duplicate group names
        seen_groups: set[str] = set()
        for group in data.groups:
            if group.name in seen_groups:
                errors.append(f"Duplicate group name: '{group.name}'")
            seen_groups.add(group.name)

        # Check that group hosts reference existing hosts
        for group in data.groups:
            for host_ref in group.hosts:
                if host_ref not in host_names:
                    errors.append(
                        f"Group '{group.name}' references unknown host '{host_ref}'"
                    )

        # Check that group children reference existing groups
        for group in data.groups:
            for child_ref in group.children:
                if child_ref not in group_names:
                    errors.append(
                        f"Group '{group.name}' references unknown child group '{child_ref}'"
                    )

        return errors


# Singleton instance
inventory_service = InventoryService()
