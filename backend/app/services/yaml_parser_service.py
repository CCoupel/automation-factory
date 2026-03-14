"""
YAML Parser Service

Parses Ansible YAML playbooks into the frontend's graph structure (Play[]).
This is the inverse of PlaybookYamlService which converts graph → YAML.
"""

import yaml
from typing import Any, Optional


# Ansible task-level keys that are NOT module keys.
# When identifying which key in a task dict is the module, we skip these.
TASK_LEVEL_KEYS = {
    "name", "when", "loop", "with_items", "with_dict", "register",
    "ignore_errors", "changed_when", "failed_when", "notify", "tags",
    "become", "become_user", "delegate_to", "run_once", "environment",
    "vars", "no_log", "any_errors_fatal", "check_mode", "diff",
    "throttle", "timeout", "retries", "delay", "until", "listen",
    "collections", "module_defaults", "block", "rescue", "always",
    "with_fileglob", "with_first_found", "with_together", "with_subelements",
}


# Layout constants matching frontend (canvasHelpers.ts, assertionsGenerator.ts)
TASK_HEIGHT = 60
TASK_SPACING = 10        # Vertical spacing between tasks inside a block
BLOCK_MIN_HEIGHT = 100
BLOCK_SPACING = 40       # Vertical spacing after a block
BLOCK_WIDTH = 220
SECTION_TASK_SPACING = 80  # Spacing between top-level elements in a section


class YamlParserService:
    """
    Parses raw Ansible YAML into the frontend Play[] graph structure.

    Each play produces:
      - modules: ModuleBlock[] (START nodes, tasks, blocks)
      - links: Link[] (chain connecting modules in order)
      - variables: PlayVariable[]
      - attributes: PlayAttributes
    """

    def parse(self, yaml_content: str) -> dict:
        """
        Parse YAML content into plays.

        Returns:
            dict with keys: plays, warnings, errors
        """
        warnings: list[str] = []
        errors: list[str] = []

        # Load YAML documents
        documents, load_errors = self._load_yaml_documents(yaml_content)
        errors.extend(load_errors)

        if documents is None:
            return {"plays": [], "warnings": warnings, "errors": errors}

        # Parse each play
        plays = []
        play_index = 0
        for doc in documents:
            if isinstance(doc, list):
                for play_dict in doc:
                    if isinstance(play_dict, dict):
                        play = self._parse_play(play_dict, play_index)
                        plays.append(play)
                        play_index += 1
            elif isinstance(doc, dict):
                play = self._parse_play(doc, play_index)
                plays.append(play)
                play_index += 1

        return {"plays": plays, "warnings": warnings, "errors": errors}

    def _load_yaml_documents(self, yaml_content: str) -> tuple[Optional[list], list[str]]:
        """
        Load YAML content, supporting multi-document files.

        Returns:
            (list of parsed documents or None on error, errors)
        """
        errors: list[str] = []
        try:
            documents = list(yaml.safe_load_all(yaml_content))
            # Filter out None documents (empty docs from trailing ---)
            documents = [d for d in documents if d is not None]
            if not documents:
                return None, errors
            return documents, errors
        except yaml.YAMLError as e:
            return None, [f"YAML parsing error: {e}"]

    def _parse_play(self, play_dict: dict, play_index: int) -> dict:
        """Parse a single play dict into the frontend Play structure."""
        play_id = f"play-{play_index + 1}"
        id_counter = [0]

        attributes = self._extract_attributes(play_dict)
        variables = self._extract_variables(play_dict)

        all_modules: list[dict] = []
        all_links: list[dict] = []

        # Parse each section
        for section in ("pre_tasks", "tasks", "post_tasks", "handlers"):
            tasks = play_dict.get(section, [])
            if not tasks:
                continue
            modules, links = self._parse_section(tasks, play_id, section, id_counter)
            all_modules.extend(modules)
            all_links.extend(links)

        return {
            "id": play_id,
            "name": play_dict.get("name", f"Play {play_index + 1}"),
            "modules": all_modules,
            "links": all_links,
            "variables": variables,
            "attributes": attributes,
        }

    def _extract_attributes(self, play_dict: dict) -> dict:
        """Extract play-level attributes into PlayAttributes format."""
        attrs: dict[str, Any] = {}
        if "hosts" in play_dict:
            attrs["hosts"] = play_dict["hosts"]
        if "remote_user" in play_dict:
            attrs["remoteUser"] = play_dict["remote_user"]
        if "gather_facts" in play_dict:
            attrs["gatherFacts"] = play_dict["gather_facts"]
        if "become" in play_dict:
            attrs["become"] = play_dict["become"]
        if "connection" in play_dict:
            attrs["connection"] = play_dict["connection"]
        if "roles" in play_dict:
            attrs["roles"] = play_dict["roles"]
        return attrs

    def _extract_variables(self, play_dict: dict) -> list[dict]:
        """Convert play vars dict to PlayVariable[] format."""
        raw_vars = play_dict.get("vars", {})
        if not raw_vars or not isinstance(raw_vars, dict):
            return []

        variables = []
        for key, value in raw_vars.items():
            variables.append({
                "key": key,
                "value": str(value),
                "type": self._infer_type(value),
                "required": True,
            })
        return variables

    def _infer_type(self, value: Any) -> str:
        """Infer variable type. Check bool before int (bool is subclass of int)."""
        if isinstance(value, bool):
            return "bool"
        if isinstance(value, int):
            return "int"
        if isinstance(value, list):
            return "list"
        if isinstance(value, dict):
            return "dict"
        return "string"

    def _parse_section(
        self,
        tasks: list[dict],
        play_id: str,
        section: str,
        id_counter: list[int],
    ) -> tuple[list[dict], list[dict]]:
        """
        Parse a task section (pre_tasks, tasks, post_tasks, handlers).

        Creates a START node, then chains all tasks with links.
        """
        section_slug = section.replace("_", "-")
        start_id = f"{play_id}-start-{section_slug}"

        start_module = {
            "id": start_id,
            "collection": "",
            "name": section.replace("_", " ").title(),
            "x": 50,
            "y": 20,
            "isPlay": True,
            "parentSection": section,
        }

        modules = [start_module]
        links: list[dict] = []
        prev_id = start_id
        current_y = 20

        for task_dict in tasks:
            if not isinstance(task_dict, dict):
                continue

            module, child_modules, child_links = self._parse_task(
                task_dict, play_id, section, id_counter,
            )
            if module is None:
                continue

            # Position top-level tasks with cumulative y
            module["x"] = 200
            module["y"] = current_y

            # Advance y based on element height
            if module.get("isBlock"):
                current_y += module.get("height", BLOCK_MIN_HEIGHT) + BLOCK_SPACING
            else:
                current_y += SECTION_TASK_SPACING

            modules.append(module)
            modules.extend(child_modules)
            links.extend(child_links)

            # Chain link from previous to current
            id_counter[0] += 1
            links.append({
                "id": f"link-{id_counter[0]}",
                "from": prev_id,
                "to": module["id"],
                "type": section,
            })
            prev_id = module["id"]

        return modules, links

    def _parse_task(
        self,
        task_dict: dict,
        play_id: str,
        section: str,
        id_counter: list[int],
        parent_id: Optional[str] = None,
        parent_section: Optional[str] = None,
    ) -> tuple[Optional[dict], list[dict], list[dict]]:
        """
        Parse a single task or block.

        Returns:
            (module dict or None, list of child modules, list of child links)
        """
        child_modules: list[dict] = []
        child_links: list[dict] = []

        # Check if this is a block
        if "block" in task_dict:
            id_counter[0] += 1
            block_id = f"block-{id_counter[0]}"

            block_sections: dict[str, list[str]] = {
                "normal": [],
                "rescue": [],
                "always": [],
            }

            # Parse block/rescue/always children
            for block_section_name, block_key in [
                ("normal", "block"),
                ("rescue", "rescue"),
                ("always", "always"),
            ]:
                section_tasks = task_dict.get(block_key, [])
                if not isinstance(section_tasks, list):
                    continue
                section_child_ids: list[str] = []
                child_y = 20
                for child_task in section_tasks:
                    if not isinstance(child_task, dict):
                        continue
                    child_module, grandchildren, grandchild_links = self._parse_task(
                        child_task, play_id, section, id_counter,
                        parent_id=block_id,
                        parent_section=block_section_name,
                    )
                    if child_module:
                        # Position children relative to block
                        child_module["x"] = 50
                        child_module["y"] = child_y

                        # Advance y based on child height
                        if child_module.get("isBlock"):
                            child_y += child_module.get("height", BLOCK_MIN_HEIGHT) + BLOCK_SPACING
                        else:
                            child_y += TASK_HEIGHT + TASK_SPACING

                        block_sections[block_section_name].append(child_module["id"])
                        section_child_ids.append(child_module["id"])
                        child_modules.append(child_module)
                        child_modules.extend(grandchildren)
                        child_links.extend(grandchild_links)

                # Create links within this block section
                # Use virtual mini-START ID matching frontend convention
                mini_start_id = f"{block_id}-{block_section_name}-start"
                if section_child_ids:
                    # Link from mini-START to first child
                    id_counter[0] += 1
                    child_links.append({
                        "id": f"link-{id_counter[0]}",
                        "from": mini_start_id,
                        "to": section_child_ids[0],
                        "type": block_section_name,
                    })
                    # Sequential links between children
                    for i in range(len(section_child_ids) - 1):
                        id_counter[0] += 1
                        child_links.append({
                            "id": f"link-{id_counter[0]}",
                            "from": section_child_ids[i],
                            "to": section_child_ids[i + 1],
                            "type": block_section_name,
                        })

            # Compute block height from children
            block_content_height = self._compute_block_height(
                block_sections, child_modules,
            )

            module = {
                "id": block_id,
                "collection": "",
                "name": task_dict.get("name", "Block"),
                "x": 0,
                "y": 0,
                "width": BLOCK_WIDTH,
                "height": block_content_height,
                "isBlock": True,
                "blockSections": block_sections,
                "parentSection": parent_section or section,
            }

            if task_dict.get("name"):
                module["taskName"] = task_dict["name"]

            if parent_id:
                module["parentId"] = parent_id

            self._apply_task_attributes(module, task_dict)

            return module, child_modules, child_links

        # Regular task — identify module key
        module_key = self._identify_module_key(task_dict)
        if module_key is None:
            return None, [], []

        id_counter[0] += 1
        module_id = f"module-{id_counter[0]}"

        # Split FQCN
        collection, name = self._split_fqcn(module_key)

        module = {
            "id": module_id,
            "collection": collection,
            "name": name,
            "x": 0,
            "y": 0,
            "parentSection": parent_section or section,
        }

        if task_dict.get("name"):
            module["taskName"] = task_dict["name"]

        if parent_id:
            module["parentId"] = parent_id

        # Module parameters
        params = task_dict.get(module_key)
        if params is not None:
            module["moduleParameters"] = params

        self._apply_task_attributes(module, task_dict)

        return module, child_modules, child_links

    def _compute_block_height(
        self,
        block_sections: dict[str, list[str]],
        child_modules: list[dict],
    ) -> int:
        """Compute block height from the tallest section's children."""
        child_map = {m["id"]: m for m in child_modules}
        max_section_height = 0

        for section_ids in block_sections.values():
            section_bottom = 0
            for child_id in section_ids:
                child = child_map.get(child_id)
                if child:
                    child_bottom = child.get("y", 0) + child.get("height", TASK_HEIGHT)
                    section_bottom = max(section_bottom, child_bottom)
            max_section_height = max(max_section_height, section_bottom)

        # Header (50) + 3 section headers (25 each) + content + padding (20)
        header_height = 50 + 3 * 25 + 20
        return max(BLOCK_MIN_HEIGHT, max_section_height + header_height)

    def _identify_module_key(self, task_dict: dict) -> Optional[str]:
        """
        Find the module key in a task dict.

        The module key is the first key not in TASK_LEVEL_KEYS.
        Returns None if no module key found.
        """
        for key in task_dict:
            if key not in TASK_LEVEL_KEYS:
                return key
        return None

    def _split_fqcn(self, module_key: str) -> tuple[str, str]:
        """
        Split a module FQCN into (collection, name).

        Examples:
            "ansible.builtin.debug" → ("ansible.builtin", "debug")
            "community.general.ufw" → ("community.general", "ufw")
            "debug" → ("", "debug")
        """
        parts = module_key.rsplit(".", 1)
        if len(parts) == 2:
            return parts[0], parts[1]
        return "", module_key

    def _apply_task_attributes(self, module: dict, task_dict: dict) -> None:
        """Map Ansible task-level attributes to frontend camelCase fields."""
        if "when" in task_dict:
            module["when"] = task_dict["when"]
        if "register" in task_dict:
            module["register"] = task_dict["register"]
        if "loop" in task_dict:
            module["loop"] = task_dict["loop"]
        if "tags" in task_dict:
            module["tags"] = task_dict["tags"]
        if task_dict.get("ignore_errors"):
            module["ignoreErrors"] = task_dict["ignore_errors"]
        if task_dict.get("become") is not None:
            module["become"] = task_dict["become"]
        if task_dict.get("delegate_to"):
            module["delegateTo"] = task_dict["delegate_to"]


# Singleton instance
yaml_parser_service = YamlParserService()
